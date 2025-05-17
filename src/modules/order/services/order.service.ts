import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '@/database/schemas/order.schema';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderStatus, PAYMENT_METHOD, PaymentStatus, ShippingStatus } from '@/shared/enums';
import { PaymentService } from './payment.service';
import { Product, ProductDocument } from '@/database/schemas/product.schema';

interface OrderWithPayment extends Order {
  paymentSession?: any;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private paymentService: PaymentService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string): Promise<OrderWithPayment> {
    const { items, paymentMethod, shippingAddress, voucherId } = createOrderDto;

    // Validate products and get their details
    const orderItems = await Promise.all(
      items.map(async (item) => {
        try {
          // Validate product ID format
          if (!Types.ObjectId.isValid(item.productId)) {
            throw new BadRequestException(`Invalid product ID format: ${item.productId}`);
          }

          const product = await this.productModel.findById(new Types.ObjectId(item.productId));
          if (!product) {
            throw new BadRequestException(`Product with ID ${item.productId} not found`);
          }

          // Check if product is in stock
          let variantPrice = 0; // Declare variantPrice variable

          if (product.variants && product.variants.length > 0) {
            // For products with variants
            if (item.variantId) {
              // Validate variant ID format
              if (!Types.ObjectId.isValid(item.variantId)) {
                throw new BadRequestException(`Invalid variant ID format: ${item.variantId}`);
              }

              // If specific variant is selected
              const variant = product.variants.find((v) => v._id && v._id.toString() === item.variantId);

              if (!variant) {
                throw new BadRequestException(`Variant with ID ${item.variantId} not found`);
              }

              if (variant.quantity < item.quantity) {
                throw new BadRequestException(
                  `Product ${product.name} (variant ${variant.sku || 'unknown'}) is out of stock`,
                );
              }

              variantPrice = variant.price;
            } else {
              // If no specific variant is selected, check total quantity across all variants
              const totalVariantQuantity = product.variants.reduce(
                (total, variant) => total + (variant.quantity || 0),
                0,
              );

              if (totalVariantQuantity < item.quantity) {
                throw new BadRequestException(`Product ${product.name} is out of stock`);
              }

              // Use the lowest price among variants
              const prices = product.variants
                .filter((v) => v.price !== undefined && v.price !== null)
                .map((v) => v.price);

              if (prices.length === 0) {
                throw new BadRequestException(`Product ${product.name} has no valid price`);
              }

              variantPrice = Math.min(...prices);
            }
          } else {
            // For simple products without variants
            throw new BadRequestException(`Product ${product.name} has no variants`);
          }

          return {
            productId: new Types.ObjectId(item.productId),
            variantId:
              item.variantId && Types.ObjectId.isValid(item.variantId) ? new Types.ObjectId(item.variantId) : undefined,
            quantity: item.quantity,
            price: variantPrice,
            productName: product.name,
          };
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          console.error('Error processing order item:', error);
          throw new BadRequestException(`Error processing product ${item.productId}: ${error.message}`);
        }
      }),
    );

    try {
      // Calculate total amount
      const totalAmount = orderItems.reduce((total, item) => total + item.price * item.quantity, 0);

      // Generate unique order number
      const timestamp = new Date().getTime().toString().slice(-8);
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
      const orderNumber = `ORD-${timestamp}${random}`;

      // Create the order with updated shipping address structure
      const order = new this.orderModel({
        userId: new Types.ObjectId(userId),
        items: orderItems,
        paymentMethod,
        shippingAddress: {
          fullName: shippingAddress.fullName,
          phone: shippingAddress.phone,
          addressLine1: shippingAddress.addressLine1,
          addressLine2: shippingAddress.addressLine2,
          city: shippingAddress.city,
          district: shippingAddress.district,
          ward: shippingAddress.ward,
          postalCode: shippingAddress.postalCode,
        },
        voucherId: voucherId && Types.ObjectId.isValid(voucherId) ? new Types.ObjectId(voucherId) : undefined,
        paymentStatus: PaymentStatus.PENDING,
        shippingStatus: ShippingStatus.PENDING,
        totalAmount: totalAmount,
        orderNumber: orderNumber,
        discountAmount: 0, // Set default discount amount
      });

      // Save the order
      const savedOrder = await order.save();

      // If online payment, create payment session
      if (paymentMethod === PAYMENT_METHOD.ONLINE_PAYMENT) {
        const paymentSession = await this.paymentService.createPaymentSession(savedOrder._id.toString(), userId);

        return {
          ...savedOrder.toObject(),
          paymentSession,
        };
      }

      return savedOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }
  }

  async findUserOrders(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      paymentStatus?: string;
      shippingStatus?: string;
    },
  ): Promise<any> {
    const { page = 1, limit = 10, paymentStatus, shippingStatus } = options;
    const skip = (page - 1) * limit;

    const query: any = { userId: new Types.ObjectId(userId) };

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (shippingStatus) {
      query.shippingStatus = shippingStatus;
    }

    const [orders, total] = await Promise.all([
      this.orderModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.orderModel.countDocuments(query),
    ]);

    return {
      items: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderDetails(id: string, userId: string): Promise<Order> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async cancelOrder(id: string, userId: string): Promise<Order> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only allow cancellation of orders that are in PENDING payment status
    if (order.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException('Cannot cancel order in current payment status');
    }

    order.paymentStatus = PaymentStatus.FAILED;
    order.shippingStatus = ShippingStatus.CANCELED;

    return order.save();
  }

  async processPayment(id: string, userId: string): Promise<any> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException('Order is not in a payable state');
    }

    if (order.paymentMethod !== PAYMENT_METHOD.ONLINE_PAYMENT) {
      throw new BadRequestException('Order is not set for online payment');
    }

    return this.paymentService.createPaymentSession(id, userId);
  }
}
