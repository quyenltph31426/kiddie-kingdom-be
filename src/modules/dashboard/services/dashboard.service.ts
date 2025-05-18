import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '@/database/schemas/order.schema';
import { Product, ProductDocument } from '@/database/schemas/product.schema';
import { User, UserDocument } from '@/database/schemas/user.schema';
import { PaymentStatus } from '@/shared/enums';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getStats(period: string = 'month'): Promise<any> {
    // Tính toán khoảng thời gian so sánh
    const now = new Date();
    const currentPeriodStart = this.getPeriodStartDate(now, period);
    const previousPeriodStart = this.getPreviousPeriodStartDate(currentPeriodStart, period);

    // Lấy dữ liệu thống kê hiện tại
    const [currentRevenue, currentProductCount, currentOrderCount, currentCustomerCount] = await Promise.all([
      this.getTotalRevenue(currentPeriodStart, now),
      this.getProductCount(currentPeriodStart, now),
      this.getOrderCount(currentPeriodStart, now),
      this.getCustomerCount(currentPeriodStart, now),
    ]);

    // Lấy dữ liệu thống kê kỳ trước để tính % thay đổi
    const [previousRevenue, previousProductCount, previousOrderCount, previousCustomerCount] = await Promise.all([
      this.getTotalRevenue(previousPeriodStart, currentPeriodStart),
      this.getProductCount(previousPeriodStart, currentPeriodStart),
      this.getOrderCount(previousPeriodStart, currentPeriodStart),
      this.getCustomerCount(previousPeriodStart, currentPeriodStart),
    ]);

    // Tính toán % thay đổi
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return 100; // Nếu kỳ trước là 0, tăng 100%
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    return [
      {
        title: 'Total Revenue',
        value: currentRevenue,
        format: 'currency',
        change: calculateChange(currentRevenue, previousRevenue),
        description: `Compared to ${this.formatPeriod(period, previousPeriodStart)}`,
      },
      {
        title: 'Total Products',
        value: currentProductCount,
        format: 'number',
        change: calculateChange(currentProductCount, previousProductCount),
        description: `Compared to ${this.formatPeriod(period, previousPeriodStart)}`,
      },
      {
        title: 'Total Orders',
        value: currentOrderCount,
        format: 'number',
        change: calculateChange(currentOrderCount, previousOrderCount),
        description: `Compared to ${this.formatPeriod(period, previousPeriodStart)}`,
      },
      {
        title: 'Total Customers',
        value: currentCustomerCount,
        format: 'number',
        change: calculateChange(currentCustomerCount, previousCustomerCount),
        description: `Compared to ${this.formatPeriod(period, previousPeriodStart)}`,
      },
    ];
  }

  private getPeriodStartDate(date: Date, period: string): Date {
    const result = new Date(date);

    switch (period) {
      case 'day':
        result.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const day = result.getDay();
        result.setDate(result.getDate() - day + (day === 0 ? -6 : 1)); // Adjust to Monday
        result.setHours(0, 0, 0, 0);
        break;
      case 'month':
        result.setDate(1);
        result.setHours(0, 0, 0, 0);
        break;
      case 'year':
        result.setMonth(0, 1);
        result.setHours(0, 0, 0, 0);
        break;
      default:
        result.setDate(1);
        result.setHours(0, 0, 0, 0);
    }

    return result;
  }

  private getPreviousPeriodStartDate(currentPeriodStart: Date, period: string): Date {
    const result = new Date(currentPeriodStart);

    switch (period) {
      case 'day':
        result.setDate(result.getDate() - 1);
        break;
      case 'week':
        result.setDate(result.getDate() - 7);
        break;
      case 'month':
        result.setMonth(result.getMonth() - 1);
        break;
      case 'year':
        result.setFullYear(result.getFullYear() - 1);
        break;
      default:
        result.setMonth(result.getMonth() - 1);
    }

    return result;
  }

  private formatPeriod(period: string, date: Date): string {
    const options: Intl.DateTimeFormatOptions = {};

    switch (period) {
      case 'day':
        options.day = 'numeric';
        options.month = 'short';
        break;
      case 'week':
        return `week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      case 'month':
        options.month = 'long';
        options.year = 'numeric';
        break;
      case 'year':
        options.year = 'numeric';
        break;
      default:
        options.month = 'long';
        options.year = 'numeric';
    }

    return date.toLocaleDateString('en-US', options);
  }

  private async getTotalRevenue(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          paymentStatus: PaymentStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  private async getProductCount(startDate: Date, endDate: Date): Promise<number> {
    return this.productModel.countDocuments({
      createdAt: { $gte: startDate, $lt: endDate },
    });
  }

  private async getOrderCount(startDate: Date, endDate: Date): Promise<number> {
    return this.orderModel.countDocuments({
      createdAt: { $gte: startDate, $lt: endDate },
    });
  }

  private async getCustomerCount(startDate: Date, endDate: Date): Promise<number> {
    return this.userModel.countDocuments({
      createdAt: { $gte: startDate, $lt: endDate },
    });
  }

  async getDetailedStats(): Promise<any> {
    // Lấy tổng số liệu (không phụ thuộc vào khoảng thời gian)
    const [totalRevenue, totalProducts, totalOrders, totalCustomers] = await Promise.all([
      this.getTotalRevenueAllTime(),
      this.productModel.countDocuments(),
      this.orderModel.countDocuments(),
      this.userModel.countDocuments(),
    ]);

    // Lấy dữ liệu biểu đồ theo tháng trong năm hiện tại
    const revenueByMonth = await this.getRevenueByMonth();
    const ordersByMonth = await this.getOrdersByMonth();

    // Lấy dữ liệu về trạng thái đơn hàng
    const ordersByStatus = await this.getOrdersByStatus();

    // Lấy top sản phẩm bán chạy
    const topProducts = await this.getTopSellingProducts();

    return {
      summary: {
        totalRevenue,
        totalProducts,
        totalOrders,
        totalCustomers,
      },
      charts: {
        revenueByMonth,
        ordersByMonth,
      },
      ordersByStatus,
      topProducts,
    };
  }

  private async getTotalRevenueAllTime(): Promise<number> {
    const result = await this.orderModel.aggregate([
      {
        $match: {
          paymentStatus: PaymentStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  private async getRevenueByMonth(): Promise<any[]> {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);

    const result = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear, $lt: endOfYear },
          paymentStatus: PaymentStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          total: { $sum: '$totalAmount' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Tạo mảng đầy đủ 12 tháng
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthData = result.find((item) => item._id === i + 1);
      return {
        month: new Date(currentYear, i, 1).toLocaleString('default', { month: 'short' }),
        revenue: monthData ? monthData.total : 0,
      };
    });

    return months;
  }

  private async getOrdersByMonth(): Promise<any[]> {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);

    const result = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear, $lt: endOfYear },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Tạo mảng đầy đủ 12 tháng
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthData = result.find((item) => item._id === i + 1);
      return {
        month: new Date(currentYear, i, 1).toLocaleString('default', { month: 'short' }),
        orders: monthData ? monthData.count : 0,
      };
    });

    return months;
  }

  private async getOrdersByStatus(): Promise<any[]> {
    const result = await this.orderModel.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    return result.map((item) => ({
      status: item._id,
      count: item.count,
    }));
  }

  private async getTopSellingProducts(limit: number = 5): Promise<any[]> {
    // Lấy tất cả đơn hàng đã hoàn thành
    const orders = await this.orderModel.find({
      paymentStatus: PaymentStatus.COMPLETED,
    });

    // Tạo map để đếm số lượng bán của mỗi sản phẩm
    const productSales = new Map();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const productId = item.productId.toString();
        const currentCount = productSales.get(productId) || 0;
        productSales.set(productId, currentCount + item.quantity);
      });
    });

    // Chuyển đổi map thành mảng và sắp xếp
    const sortedProducts = [...productSales.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);

    // Lấy thông tin chi tiết của sản phẩm
    const productIds = sortedProducts.map(([id]) => id);
    const products = await this.productModel
      .find({
        _id: { $in: productIds },
      })
      .select('name images');

    // Kết hợp thông tin sản phẩm với số lượng bán
    return sortedProducts.map(([id, quantity]) => {
      const product = products.find((p) => p._id.toString() === id);
      return {
        id,
        name: product ? product.name : 'Unknown Product',
        image: product && product.images && product.images.length > 0 ? product.images[0] : null,
        quantity,
      };
    });
  }
}
