import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '@/database/schemas/order.schema';
import { Product, ProductDocument } from '@/database/schemas/product.schema';
import { User, UserDocument } from '@/database/schemas/user.schema';
import { PaymentStatus, ShippingStatus } from '@/shared/enums';
import { Types } from 'mongoose';
import { RevenueInterval, RevenueStatsDto } from '../dto/revenue-stats.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getStats(period: string = 'month'): Promise<any> {
    const now = new Date();
    const currentPeriodStart = this.getPeriodStartDate(now, period);
    const previousPeriodStart = this.getPreviousPeriodStartDate(currentPeriodStart, period);

    const [currentRevenue, currentProductCount, currentOrderCount, currentCustomerCount] = await Promise.all([
      this.getTotalRevenue(currentPeriodStart, now),
      this.getProductCount(currentPeriodStart, now),
      this.getOrderCount(currentPeriodStart, now),
      this.getCustomerCount(currentPeriodStart, now),
    ]);

    const [previousRevenue, previousProductCount, previousOrderCount, previousCustomerCount] = await Promise.all([
      this.getTotalRevenue(previousPeriodStart, currentPeriodStart),
      this.getProductCount(previousPeriodStart, currentPeriodStart),
      this.getOrderCount(previousPeriodStart, currentPeriodStart),
      this.getCustomerCount(previousPeriodStart, currentPeriodStart),
    ]);

    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return 100; // Nếu kỳ trước là 0, tăng 100%
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    return [
      {
        title: 'Tổng doanh thu',
        value: currentRevenue,
        format: 'currency',
        change: calculateChange(currentRevenue, previousRevenue),
        description: `So với ${this.formatPeriod(period, previousPeriodStart)}`,
      },
      {
        title: 'Tổng sản phẩm',
        value: currentProductCount,
        format: 'number',
        change: calculateChange(currentProductCount, previousProductCount),
        description: `So với ${this.formatPeriod(period, previousPeriodStart)}`,
      },
      {
        title: 'Tổng đơn hàng',
        value: currentOrderCount,
        format: 'number',
        change: calculateChange(currentOrderCount, previousOrderCount),
        description: `So với ${this.formatPeriod(period, previousPeriodStart)}`,
      },
      {
        title: 'Tổng khách hàng',
        value: currentCustomerCount,
        format: 'number',
        change: calculateChange(currentCustomerCount, previousCustomerCount),
        description: `So với ${this.formatPeriod(period, previousPeriodStart)}`,
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
        return `tuần trước ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
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
          shippingStatus: ShippingStatus.DELIVERED,
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
      paymentStatus: PaymentStatus.COMPLETED,
      shippingStatus: ShippingStatus.DELIVERED,
    });
  }

  private async getCustomerCount(startDate: Date, endDate: Date): Promise<number> {
    return this.userModel.countDocuments({
      createdAt: { $gte: startDate, $lt: endDate },
    });
  }

  async getDetailedStats(): Promise<any> {
    const [totalRevenue, totalProducts, totalOrders, totalCustomers] = await Promise.all([
      this.getTotalRevenueAllTime(),
      this.productModel.countDocuments(),
      this.orderModel.countDocuments(),
      this.userModel.countDocuments(),
    ]);

    const revenueByMonth = await this.getRevenueByMonth();
    const ordersByMonth = await this.getOrdersByMonth();

    const ordersByStatus = await this.getOrdersByStatus();

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

  async getTopSellingProducts(limit: number | string = 10, period?: string): Promise<any[]> {
    // Đảm bảo limit là một số nguyên hợp lệ
    let limitValue = 10; // Giá trị mặc định

    if (limit !== undefined) {
      // Chuyển đổi limit thành số
      const parsedLimit = parseInt(limit.toString(), 10);

      // Kiểm tra nếu là số hợp lệ và lớn hơn 0
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limitValue = parsedLimit;
      }
    }

    // Xác định khoảng thời gian
    let dateFilter: any = {};
    if (period) {
      const now = new Date();
      switch (period) {
        case 'day':
          dateFilter = {
            $gte: new Date(now.setHours(0, 0, 0, 0)),
            $lte: new Date(now.setHours(23, 59, 59, 999)),
          };
          break;
        case 'week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          dateFilter = {
            $gte: startOfWeek,
            $lte: now,
          };
          break;
        case 'month':
          dateFilter = {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lte: now,
          };
          break;
        case 'year':
          dateFilter = {
            $gte: new Date(now.getFullYear(), 0, 1),
            $lte: now,
          };
          break;
      }
    }

    // Xây dựng pipeline để tính số lượng bán của từng sản phẩm
    const matchStage: any = {
      paymentStatus: PaymentStatus.COMPLETED,
    };

    if (Object.keys(dateFilter).length > 0) {
      matchStage.createdAt = dateFilter;
    }

    // Định nghĩa pipeline theo cách phù hợp với TypeScript
    const pipeline = [];

    // Stage 1: Match
    pipeline.push({ $match: matchStage });

    // Stage 2: Unwind
    pipeline.push({ $unwind: '$items' });

    // Stage 3: Group
    pipeline.push({
      $group: {
        _id: '$items.productId',
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    });

    // Stage 4: Sort
    pipeline.push({ $sort: { totalSold: -1 } });

    // Stage 5: Limit - Sử dụng giá trị đã được xác thực
    pipeline.push({ $limit: limitValue });

    // Stage 6: Lookup
    pipeline.push({
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDetails',
      },
    });

    // Stage 7: Unwind
    pipeline.push({ $unwind: '$productDetails' });

    // Stage 8: Project
    pipeline.push({
      $project: {
        _id: 0,
        id: '$_id',
        name: '$productDetails.name',
        sales: '$totalSold',
        revenue: '$revenue',
        stock: {
          $reduce: {
            input: '$productDetails.variants',
            initialValue: 0,
            in: { $add: ['$$value', '$$this.quantity'] },
          },
        },
        image: { $arrayElemAt: ['$productDetails.images', 0] },
        slug: '$productDetails.slug',
      },
    });

    return await this.orderModel.aggregate(pipeline);
  }

  async getRevenueStats(options: RevenueStatsDto): Promise<any> {
    const { interval, startDate, endDate, productIds } = options;

    let dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.$lte = new Date(endDate);
      }
    } else {
      const currentYear = new Date().getFullYear();
      dateFilter.$gte = new Date(currentYear, 0, 1);
      dateFilter.$lte = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    }

    const matchStage: any = {
      createdAt: dateFilter,
      paymentStatus: PaymentStatus.COMPLETED,
      shippingStatus: ShippingStatus.DELIVERED,
    };

    let groupByDate: any;
    let sortStage: any;
    let projectStage: any;

    switch (interval) {
      case RevenueInterval.DAY:
        groupByDate = {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        };
        projectStage = {
          _id: 0,
          date: '$_id',
          revenue: 1,
          orderCount: 1,
          formattedDate: {
            $dateFromString: { dateString: '$_id' },
          },
        };
        sortStage = { _id: 1 };
        break;

      case RevenueInterval.WEEK:
        groupByDate = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
        projectStage = {
          _id: 0,
          year: '$_id.year',
          week: '$_id.week',
          revenue: 1,
          orderCount: 1,
          formattedDate: {
            $dateFromParts: {
              isoWeekYear: '$_id.year',
              isoWeek: '$_id.week',
              isoDayOfWeek: 1,
            },
          },
        };
        sortStage = { '_id.year': 1, '_id.week': 1 };
        break;

      case RevenueInterval.MONTH:
        groupByDate = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        projectStage = {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          revenue: 1,
          orderCount: 1,
          formattedDate: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: 1,
            },
          },
        };
        sortStage = { '_id.year': 1, '_id.month': 1 };
        break;

      case RevenueInterval.YEAR:
        groupByDate = { $year: '$createdAt' };
        projectStage = {
          _id: 0,
          year: '$_id',
          revenue: 1,
          orderCount: 1,
          formattedDate: {
            $dateFromParts: {
              year: '$_id',
              month: 1,
              day: 1,
            },
          },
        };
        sortStage = { _id: 1 };
        break;
    }

    let pipeline = [];

    pipeline.push({ $match: matchStage });

    if (productIds && productIds.length > 0) {
      pipeline.push({ $unwind: '$items' });

      pipeline.push({
        $match: {
          'items.productId': {
            $in: productIds.map((id) => new Types.ObjectId(id)),
          },
        },
      });

      pipeline.push({
        $group: {
          _id: {
            orderId: '$_id',
            date: groupByDate,
          },
          totalAmount: { $first: '$totalAmount' },
          orderDate: { $first: '$createdAt' },
        },
      });

      pipeline.push({
        $group: {
          _id: '$_id.date',
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      });
    } else {
      pipeline.push({
        $group: {
          _id: groupByDate,
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      });
    }

    pipeline.push({ $sort: sortStage });

    pipeline.push({ $project: projectStage });

    const results = await this.orderModel.aggregate(pipeline);

    const formattedResults = results.map((item) => {
      let label = '';

      switch (interval) {
        case RevenueInterval.DAY:
          label = new Date(item.formattedDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          break;
        case RevenueInterval.WEEK:
          label = `Week ${item.week}, ${item.year}`;
          break;
        case RevenueInterval.MONTH:
          label = new Date(item.formattedDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
          });
          break;
        case RevenueInterval.YEAR:
          label = item.year.toString();
          break;
      }

      return {
        label,
        revenue: item.revenue,
        orderCount: item.orderCount,
        date: item.formattedDate,
      };
    });

    const totalRevenue = formattedResults.reduce((sum, item) => sum + item.revenue, 0);
    const totalOrders = formattedResults.reduce((sum, item) => sum + item.orderCount, 0);

    return {
      interval,
      totalRevenue,
      totalOrders,
      data: formattedResults,
    };
  }

  async getTopCustomers(limit: number | string = 10, period?: string): Promise<any[]> {
    // Đảm bảo limit là một số nguyên hợp lệ
    let limitValue = 10; // Giá trị mặc định

    if (limit !== undefined) {
      // Chuyển đổi limit thành số
      const parsedLimit = parseInt(limit.toString(), 10);

      // Kiểm tra nếu là số hợp lệ và lớn hơn 0
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limitValue = parsedLimit;
      }
    }

    // Xác định khoảng thời gian nếu có
    const dateFilter: any = {};
    if (period) {
      const now = new Date();

      switch (period) {
        case 'day':
          dateFilter.$gte = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          dateFilter.$gte = startOfWeek;
          break;
        case 'month':
          dateFilter.$gte = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          dateFilter.$gte = new Date(now.getFullYear(), 0, 1);
          break;
      }

      dateFilter.$lte = new Date();
    }

    // Xây dựng stage match
    const matchStage: any = {
      paymentStatus: PaymentStatus.COMPLETED,
      shippingStatus: ShippingStatus.DELIVERED,
    };

    if (Object.keys(dateFilter).length > 0) {
      matchStage.createdAt = dateFilter;
    }

    // Sử dụng kiểu dữ liệu any[] để tránh lỗi TypeScript
    const pipeline: any[] = [
      // Stage 1: Match - lọc các đơn hàng đã hoàn thành và đã giao
      { $match: matchStage },

      // Stage 2: Kiểm tra và chuyển đổi userId nếu cần
      {
        $addFields: {
          userIdObj: {
            $cond: {
              if: { $eq: [{ $type: '$userId' }, 'string'] },
              then: { $toObjectId: '$userId' },
              else: '$userId',
            },
          },
        },
      },

      // Stage 3: Group - nhóm theo userId và tính tổng số tiền
      {
        $group: {
          _id: '$userIdObj',
          totalSpent: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          lastOrderDate: { $max: '$createdAt' },
        },
      },

      // Stage 4: Sort - sắp xếp theo tổng số tiền giảm dần
      { $sort: { totalSpent: -1 } },

      // Stage 5: Limit - giới hạn số lượng kết quả
      { $limit: limitValue },

      // Stage 6: Lookup - lấy thông tin chi tiết của người dùng
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
        },
      },

      // Stage 7: Match - lọc bỏ các kết quả không có thông tin người dùng
      {
        $match: {
          userDetails: { $ne: [] },
        },
      },

      // Stage 8: Unwind - giải nén mảng userDetails
      { $unwind: '$userDetails' },

      // Stage 9: Project - định dạng kết quả trả về
      {
        $project: {
          _id: 0,
          id: '$_id',
          name: {
            $concat: [{ $ifNull: ['$userDetails.firstName', ''] }, ' ', { $ifNull: ['$userDetails.lastName', ''] }],
          },
          email: '$userDetails.email',
          username: '$userDetails.username',
          avatar: '$userDetails.avatar',
          totalSpent: 1,
          orderCount: 1,
          lastOrderDate: 1,
        },
      },
    ];

    return await this.orderModel.aggregate(pipeline);
  }
}
