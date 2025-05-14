import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '@/database/schemas/order.schema';
import { PaymentHistory, PaymentHistoryDocument } from '@/database/schemas/payment-history.schema';
import { UpdateOrderDto } from '../dto/update-order.dto';

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
    status?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 10, search, status, paymentMethod, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
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
    if (updateOrderDto.status) {
      order.status = updateOrderDto.status;
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

    // Get orders by status
    const ordersByStatus = await this.orderModel.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Get orders by payment method
    const ordersByPaymentMethod = await this.orderModel.aggregate([
      { $match: query },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
    ]);

    // Get total revenue
    const revenueData = await this.orderModel.aggregate([
      { $match: { ...query, status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    // Get daily revenue for chart
    const dailyRevenue = await this.orderModel.aggregate([
      { $match: { ...query, status: 'COMPLETED' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      totalOrders,
      totalRevenue,
      ordersByStatus: ordersByStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      ordersByPaymentMethod: ordersByPaymentMethod.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      dailyRevenue: dailyRevenue.map((item) => ({
        date: item._id,
        revenue: item.total,
        orders: item.count,
      })),
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
        .populate('orderId', 'orderNumber')
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
