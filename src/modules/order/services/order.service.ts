import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '@/database/schemas/order.schema';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderStatus, PAYMENT_METHOD, PaymentStatus, ShippingStatus } from '@/shared/enums';
import { PaymentService } from './payment.service';
import { Product, ProductDocument } from '@/database/schemas/product.schema';
import { VoucherService } from '@/modules/voucher/services/voucher.service';
import { Voucher, VoucherDocument } from '@/database/schemas/voucher.schema';
import { ProductService } from '@/modules/product/services/product.service';
import { ProductReview, ProductReviewDocument } from '@/database/schemas/product-review.schema';

interface OrderWithPayment extends Order {
  paymentSession?: any;
  appliedVoucher?: {
    code: string;
    name: string;
    discountAmount: number;
  } | null;
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
    @InjectModel(ProductReview.name) private reviewModel: Model<ProductReviewDocument>,
    private paymentService: PaymentService,
    private voucherService: VoucherService,
    private productService: ProductService,
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
                  `Product ${product.name} (variant ${variant.sku || 'unknown'}) đã hết hàng`,
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
      // Calculate subtotal amount (before discount)
      const subtotal = orderItems.reduce((total, item) => total + item.price * item.quantity, 0);

      // Initialize discount amount
      let discountAmount = 0;
      let appliedVoucher = null;

      // Apply voucher if provided
      if (voucherId) {
        // Validate voucher ID format
        if (!Types.ObjectId.isValid(voucherId)) {
          throw new BadRequestException(`Invalid voucher ID format: ${voucherId}`);
        }

        try {
          // Find voucher by ID first
          const voucher = await this.voucherModel.findById(voucherId);
          if (!voucher) {
            throw new BadRequestException('Voucher not found');
          }

          // Verify voucher with the subtotal
          const verifyResult = await this.voucherService.verifyVoucherByCode(voucher.code, subtotal);

          if (!verifyResult.valid) {
            throw new BadRequestException(`Voucher validation failed: ${verifyResult.message}`);
          }

          // Set discount amount from voucher verification
          discountAmount = verifyResult.discountAmount;
          appliedVoucher = verifyResult.voucher;

          // Apply the voucher (increment usage count)
          await this.voucherService.applyVoucherById(voucherId);
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw new BadRequestException(`Error applying voucher: ${error.message}`);
        }
      }

      // Calculate final total amount after discount
      const totalAmount = Math.max(0, subtotal - discountAmount);

      // Generate unique order number
      const timestamp = new Date().getTime().toString().slice(-8);
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
      const orderCode = `ORD-${timestamp}${random}`;

      // Create the order with updated shipping address structure
      const order = new this.orderModel({
        userId: new Types.ObjectId(userId),
        items: orderItems,
        paymentMethod,
        orderCode,
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
        discountAmount: discountAmount,
      });

      // Save the order
      const savedOrder = await order.save();

      // Update product variant stock
      try {
        for (const item of orderItems) {
          if (item.productId && item.variantId) {
            await this.productService.updateVariantStockOnOrder(
              item.productId.toString(),
              item.variantId.toString(),
              item.quantity,
              true, // isOrderCreation = true
            );
          }
        }
      } catch (error) {
        this.logger.error(`Failed to update product variant stock: ${error.message}`);
        // Consider rolling back the order if stock update fails
        // For now, we'll continue as the order is already created
      }

      // If online payment, create payment session
      if (paymentMethod === PAYMENT_METHOD.ONLINE_PAYMENT) {
        const paymentSession = await this.paymentService.createPaymentSession(savedOrder._id.toString(), userId);

        return {
          ...savedOrder.toObject(),
          paymentSession,
          appliedVoucher: appliedVoucher
            ? {
                code: appliedVoucher.code,
                name: appliedVoucher.name,
                discountAmount,
              }
            : null,
        };
      }

      return {
        ...savedOrder.toObject(),
        appliedVoucher: appliedVoucher
          ? {
              code: appliedVoucher.code,
              name: appliedVoucher.name,
              discountAmount,
            }
          : null,
      };
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

    const productIds = orders.flatMap((order) => order.items.map((item) => item.productId));

    const products = await this.productModel
      .find({
        _id: { $in: productIds },
      })
      .select('name images variants');

    const productMap = new Map();
    products.forEach((product) => {
      productMap.set(product._id.toString(), {
        name: product.name,
        image: product.images && product.images.length > 0 ? product.images[0] : null,
        variants: product.variants || [],
      });
    });

    const userReviews = await this.reviewModel.find({
      userId: new Types.ObjectId(userId),
      productId: { $in: productIds },
      orderId: { $in: orders.map((order) => order._id) },
    });

    const reviewedProductMap = new Map();
    userReviews.forEach((review) => {
      const key = `${review.productId.toString()}_${review.orderId.toString()}`;
      reviewedProductMap.set(key, true);
    });

    const enrichedOrders = orders.map((order) => {
      const orderObj = order.toObject ? order.toObject() : order;

      const enrichedItems = orderObj.items.map((item) => {
        const productInfo = productMap.get(item.productId.toString());

        const reviewKey = `${item.productId.toString()}_${orderObj._id.toString()}`;
        const isReviewed = reviewedProductMap.has(reviewKey);

        if (!productInfo) {
          return {
            ...item,
            isReviewed,
          };
        }

        let variantInfo = null;
        if (item.variantId && productInfo.variants) {
          variantInfo = productInfo.variants.find((variant) => variant._id.toString() === item.variantId.toString());
        }

        return {
          ...item,
          productName: productInfo.name,
          productImage: productInfo.image,
          attributes: variantInfo ? variantInfo.attributes : {},
          isReviewed,
        };
      });

      return {
        ...orderObj,
        items: enrichedItems,
      };
    });

    return {
      items: enrichedOrders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderDetails(id: string, userId: string): Promise<any> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Get product IDs from order items
    const productIds = order.items.map((item) => item.productId);

    // Fetch product details
    const products = await this.productModel
      .find({
        _id: { $in: productIds },
      })
      .select('name images variants');

    // Create product map for quick lookup
    const productMap = new Map();
    products.forEach((product) => {
      productMap.set(product._id.toString(), {
        name: product.name,
        image: product.images && product.images.length > 0 ? product.images[0] : null,
        variants: product.variants || [],
      });
    });

    // Check if user has reviewed products in this order
    const userReviews = await this.reviewModel.find({
      userId: new Types.ObjectId(userId),
      productId: { $in: productIds },
      orderId: order._id,
    });

    // Create map of reviewed products
    const reviewedProductMap = new Map();
    userReviews.forEach((review) => {
      const key = `${review.productId.toString()}_${order._id.toString()}`;
      reviewedProductMap.set(key, true);
    });

    // Convert order to object and enrich with product details
    const orderObj = order.toObject ? order.toObject() : order;

    // Enrich order items with product details
    const enrichedItems = orderObj.items.map((item) => {
      const productInfo = productMap.get(item.productId.toString());

      const reviewKey = `${item.productId.toString()}_${orderObj._id.toString()}`;
      const isReviewed = reviewedProductMap.has(reviewKey);

      if (!productInfo) {
        return {
          ...item,
          isReviewed,
        };
      }

      let variantInfo = null;
      if (item.variantId && productInfo.variants) {
        variantInfo = productInfo.variants.find((variant) => variant._id.toString() === item.variantId.toString());
      }

      return {
        ...item,
        productName: productInfo.name,
        productImage: productInfo.image,
        attributes: variantInfo ? variantInfo.attributes : {},
        isReviewed,
      };
    });

    return {
      ...orderObj,
      items: enrichedItems,
    };
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

    // Restore product quantities
    try {
      for (const item of order.items) {
        if (item.productId && item.variantId) {
          await this.productService.updateVariantStockOnOrder(
            item.productId.toString(),
            item.variantId.toString(),
            item.quantity,
            false, // isOrderCreation = false (restoring stock)
          );
        }
      }
    } catch (error) {
      console.error(`Failed to restore product quantities: ${error.message}`);
      // Continue with order cancellation even if stock restoration fails
    }

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

  async cancelCashOnDeliveryOrder(id: string, userId: string, cancelledReason?: string): Promise<Order> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only allow cancellation of orders that are CASH_ON_DELIVERY and in PENDING shipping status
    if (order.paymentMethod !== PAYMENT_METHOD.CASH_ON_DELIVERY) {
      throw new BadRequestException('Only Cash on Delivery orders can be canceled');
    }

    if (order.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException('Cannot cancel order in current payment status');
    }

    if (order.shippingStatus !== ShippingStatus.PENDING) {
      throw new BadRequestException('Only orders with PENDING shipping status can be canceled');
    }

    // Update order status
    order.shippingStatus = ShippingStatus.CANCELED;
    order.cancelledAt = new Date();
    order.cancelledReason = cancelledReason;

    // Restore product quantities
    try {
      console.log(order.items);
      for (const item of order.items) {
        if (item.productId && item.variantId) {
          await this.productService.updateVariantStockOnOrder(
            item.productId.toString(),
            item.variantId.toString(),
            item.quantity,
            false, // isOrderCreation = false (restoring stock)
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to restore product quantities: ${error.message}`);
      throw new InternalServerErrorException(`Failed to restore product quantities: ${error.message}`);
      // Continue with order cancellation even if stock restoration fails
    }

    return order.save();
  }
}
