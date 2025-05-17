import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '@/database/schemas/order.schema';
import { PaymentHistory, PaymentHistoryDocument } from '@/database/schemas/payment-history.schema';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { PaymentStatus, ShippingStatus } from '@/shared/enums';

@Injectable()
export class OrderAdminService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(PaymentHistory.name) private paymentHistoryModel: Model<PaymentHistoryDocument>,
  ) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    paymentStatus?: string;
    shippingStatus?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 10, search, paymentStatus, shippingStatus, paymentMethod, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (shippingStatus) {
      query.shippingStatus = shippingStatus;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (search) {
      query.$or = [
        { orderCode: { $regex: search, $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};

      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const [orders, total] = await Promise.all([
      this.orderModel.find(query).populate('userId', 'email username').sort({ createdAt: -1 }).skip(skip).limit(limit),
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

  async findOne(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id).populate('userId', 'email username');

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.orderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Update order fields
    if (updateOrderDto.paymentStatus) {
      order.paymentStatus = updateOrderDto.paymentStatus;

      // If payment is completed, set paidAt
      if (updateOrderDto.paymentStatus === PaymentStatus.COMPLETED && !order.paidAt) {
        order.paidAt = new Date();
      }
    }

    if (updateOrderDto.shippingStatus) {
      order.shippingStatus = updateOrderDto.shippingStatus;

      // If order is shipped, set shippedAt
      if (updateOrderDto.shippingStatus === ShippingStatus.SHIPPED && !order.shippedAt) {
        order.shippedAt = updateOrderDto.shippedAt || new Date();
      }

      // If order is delivered, set deliveredAt
      if (updateOrderDto.shippingStatus === ShippingStatus.DELIVERED && !order.deliveredAt) {
        order.deliveredAt = updateOrderDto.deliveredAt || new Date();
      }
    }

    if (updateOrderDto.trackingNumber) {
      order.trackingNumber = updateOrderDto.trackingNumber;
    }

    if (updateOrderDto.shippedAt) {
      order.shippedAt = updateOrderDto.shippedAt;
    }

    if (updateOrderDto.deliveredAt) {
      order.deliveredAt = updateOrderDto.deliveredAt;
    }

    return order.save();
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const order = await this.orderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await order.deleteOne();

    return {
      success: true,
      message: 'Order deleted successfully',
    };
  }

  async getOrderStats(startDate?: string, endDate?: string): Promise<any> {
    const dateQuery: any = {};

    if (startDate || endDate) {
      if (startDate) {
        dateQuery.$gte = new Date(startDate);
      }

      if (endDate) {
        dateQuery.$lte = new Date(endDate);
      }
    }

    const query = startDate || endDate ? { createdAt: dateQuery } : {};

    // Get total orders count
    const totalOrders = await this.orderModel.countDocuments(query);

    // Get orders by payment status
    const ordersByPaymentStatus = await this.orderModel.aggregate([
      { $match: query },
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
    ]);

    // Get orders by shipping status
    const ordersByShippingStatus = await this.orderModel.aggregate([
      { $match: query },
      { $group: { _id: '$shippingStatus', count: { $sum: 1 } } },
    ]);

    // Get orders by payment method
    const ordersByPaymentMethod = await this.orderModel.aggregate([
      { $match: query },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
    ]);

    // Calculate total revenue from completed orders
    const revenueData = await this.orderModel.aggregate([
      {
        $match: {
          ...query,
          paymentStatus: PaymentStatus.COMPLETED,
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    return {
      totalOrders,
      ordersByPaymentStatus: ordersByPaymentStatus.map((item) => ({
        status: item._id,
        count: item.count,
      })),
      ordersByShippingStatus: ordersByShippingStatus.map((item) => ({
        status: item._id,
        count: item.count,
      })),
      ordersByPaymentMethod: ordersByPaymentMethod.map((item) => ({
        method: item._id,
        count: item.count,
      })),
      totalRevenue,
    };
  }

  async getPaymentHistory(options: { page?: number; limit?: number; status?: string }): Promise<any> {
    const { page = 1, limit = 10, status } = options;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    const [payments, total] = await Promise.all([
      this.paymentHistoryModel
        .find(query)
        .populate('userId', 'email username')
        .populate('orderId', 'orderCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.paymentHistoryModel.countDocuments(query),
    ]);

    return {
      items: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
