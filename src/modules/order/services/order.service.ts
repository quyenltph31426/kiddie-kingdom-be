import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '@/database/schemas/order.schema';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderStatus, PAYMENT_METHOD } from '@/shared/enums';
import { PaymentService } from './payment.service';
import { ProductService } from '@/modules/product/services/product.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private paymentService: PaymentService,
    private productService: ProductService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string): Promise<Order> {
    const { items, paymentMethod, shippingAddress, voucherId } = createOrderDto;

    // Validate products and get their details
    const orderItems = await Promise.all(
      items.map(async (item) => {
        const product = await this.productService.findOne(item.productId);
        if (!product) {
          throw new BadRequestException(`Product with ID ${item.productId} not found`);
        }

        // Check if product is in stock
        if (product.quantity < item.quantity) {
          throw new BadRequestException(`Product ${product.name} is out of stock`);
        }

        // Get variant if specified
        let variantPrice = product.price;
        if (item.variantId) {
          const variant = product.variants.find((v) => v._id.toString() === item.variantId);
          if (!variant) {
            throw new BadRequestException(`Variant with ID ${item.variantId} not found`);
          }
          variantPrice = variant.price;
        }

        return {
          productId: new Types.ObjectId(item.productId),
          variantId: item.variantId ? new Types.ObjectId(item.variantId) : undefined,
          quantity: item.quantity,
          price: variantPrice,
          productName: product.name,
          attributes: item.attributes,
        };
      }),
    );

    // Create the order
    const order = new this.orderModel({
      userId: new Types.ObjectId(userId),
      items: orderItems,
      paymentMethod,
      shippingAddress,
      voucherId: voucherId ? new Types.ObjectId(voucherId) : undefined,
      status: OrderStatus.TO_PAY,
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
  }

  async findUserOrders(userId: string, options: { page?: number; limit?: number; status?: string }) {
    const { page = 1, limit = 10, status } = options;
    const skip = (page - 1) * limit;

    const query: any = { userId: new Types.ObjectId(userId) };

    if (status) {
      query.status = status;
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

  async findUserOrder(id: string, userId: string): Promise<Order> {
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

    // Only allow cancellation of orders that are in TO_PAY status
    if (order.status !== OrderStatus.TO_PAY) {
      throw new BadRequestException('Cannot cancel order in current status');
    }

    order.status = OrderStatus.CANCELED;
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

    if (order.status !== OrderStatus.TO_PAY) {
      throw new BadRequestException('Order is not in a payable state');
    }

    if (order.paymentMethod !== PAYMENT_METHOD.ONLINE_PAYMENT) {
      throw new BadRequestException('Order is not set for online payment');
    }

    return this.paymentService.createPaymentSession(id, userId);
  }
}
