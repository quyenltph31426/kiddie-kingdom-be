import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductReview, ProductReviewDocument } from '@/database/schemas/product-review.schema';
import { Product, ProductDocument } from '@/database/schemas/product.schema';
import { Order, OrderDocument } from '@/database/schemas/order.schema';
import { CreateProductReviewDto } from '../dto/create-product-review.dto';
import { UpdateProductReviewDto } from '../dto/update-product-review.dto';
import { AdminUpdateReviewDto } from '../dto/admin-update-review.dto';
import { PaymentStatus, ShippingStatus } from '@/shared/enums';

@Injectable()
export class ProductReviewService {
  constructor(
    @InjectModel(ProductReview.name) private reviewModel: Model<ProductReviewDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async create(userId: string, createReviewDto: CreateProductReviewDto): Promise<ProductReview> {
    const { productId, rating, comment, images } = createReviewDto;

    // Check if product exists
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if user already reviewed this product
    const existingReview = await this.reviewModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    // Check if user has purchased this product and received it successfully
    const successfulOrders = await this.orderModel.find({
      userId: new Types.ObjectId(userId),
      paymentStatus: PaymentStatus.COMPLETED,
      shippingStatus: ShippingStatus.DELIVERED,
      'items.productId': new Types.ObjectId(productId),
    });

    if (!successfulOrders || successfulOrders.length === 0) {
      throw new ForbiddenException('You can only review products that you have purchased and received');
    }

    // Create the review
    const review = new this.reviewModel({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
      rating,
      comment,
      images: images || [],
      isPurchased: true,
    });

    const savedReview = await review.save();

    // Update product rating
    await this.updateProductRating(productId);

    return savedReview;
  }

  async getProductReviews(
    productId: string,
    options: {
      page?: number;
      limit?: number;
      rating?: number;
    },
  ) {
    if (!productId) {
      throw new BadRequestException('Product ID is required');
    }

    const { page = 1, limit = 10, rating } = options;
    const skip = (page - 1) * limit;

    const query: any = {
      productId: new Types.ObjectId(productId),
      isActive: true,
    };

    if (rating) {
      query.rating = rating;
    }

    const [items, total, ratingStats] = await Promise.all([
      this.reviewModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username email avatar')
        .lean(),
      this.reviewModel.countDocuments(query),
      this.getProductRatingStats(productId),
    ]);

    const reviews = items.map((item) => {
      const { userId, ...rest } = item;
      return {
        ...rest,
        user: userId,
      };
    });

    return {
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      ratingStats,
      items: reviews,
    };
  }

  async getProductReviewsAdmin(
    productId: string,
    options: {
      page?: number;
      limit?: number;
      rating?: number;
      isActive?: boolean;
    },
  ) {
    if (!productId) {
      throw new BadRequestException('Product ID is required');
    }

    const { page = 1, limit = 10, rating, isActive } = options;
    const skip = (page - 1) * limit;

    const query: any = {
      productId: new Types.ObjectId(productId),
    };

    if (rating) {
      query.rating = rating;
    }

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const [items, total, ratingStats] = await Promise.all([
      this.reviewModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username email avatar')
        .populate('productId', 'name slug images')
        .lean(),
      this.reviewModel.countDocuments(query),
      this.getProductRatingStats(productId),
    ]);

    const reviews = items.map((item) => {
      const { userId, productId, ...rest } = item;
      return {
        ...rest,
        user: userId,
        product: productId,
      };
    });

    return {
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      ratingStats,
      items: reviews,
    };
  }

  async getProductRatingStats(productId: string) {
    const stats = await this.reviewModel.aggregate([
      {
        $match: {
          productId: new Types.ObjectId(productId),
          isActive: true,
        },
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratingCounts: {
            $push: '$rating',
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalReviews: 1,
          averageRating: { $round: ['$averageRating', 1] },
          ratingCounts: 1,
        },
      },
    ]);

    if (!stats.length) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      };
    }

    // Calculate rating distribution
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    stats[0].ratingCounts.forEach((rating) => {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });

    return {
      totalReviews: stats[0].totalReviews,
      averageRating: stats[0].averageRating,
      ratingDistribution,
    };
  }

  async findOne(id: string): Promise<ProductReview> {
    const review = await this.reviewModel.findById(id).populate('userId', 'name avatar').exec();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async update(id: string, userId: string, updateReviewDto: UpdateProductReviewDto): Promise<ProductReview> {
    // Check if review exists and belongs to the user
    const review = await this.reviewModel.findOne({
      _id: id,
      userId: new Types.ObjectId(userId),
    });

    if (!review) {
      throw new NotFoundException('Review not found or does not belong to you');
    }

    // Update the review
    const updatedReview = await this.reviewModel.findByIdAndUpdate(id, updateReviewDto, {
      new: true,
      runValidators: true,
    });

    // Update product rating if rating changed
    if (updateReviewDto.rating && updateReviewDto.rating !== review.rating) {
      await this.updateProductRating(review.productId.toString());
    }

    return updatedReview;
  }

  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    // Check if review exists and belongs to the user
    const review = await this.reviewModel.findOne({
      _id: id,
      userId: new Types.ObjectId(userId),
    });

    if (!review) {
      throw new NotFoundException('Review not found or does not belong to you');
    }

    // Delete the review
    await this.reviewModel.findByIdAndDelete(id);

    // Update product rating
    await this.updateProductRating(review.productId.toString());

    return { success: true };
  }

  async adminUpdate(id: string, adminId: string, updateDto: AdminUpdateReviewDto): Promise<ProductReview> {
    const review = await this.reviewModel.findById(id);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updateData: any = { ...updateDto };

    // If verifying the review, add verification details
    if (updateDto.isVerified === true && !review.isVerified) {
      updateData.verifiedBy = new Types.ObjectId(adminId);
      updateData.verifiedAt = new Date();
    }

    const updatedReview = await this.reviewModel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    // If review visibility changed, update product rating
    if (updateDto.isActive !== undefined && updateDto.isActive !== review.isActive) {
      await this.updateProductRating(review.productId.toString());
    }

    return updatedReview;
  }

  async adminRemove(id: string): Promise<{ success: boolean }> {
    const review = await this.reviewModel.findById(id);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.reviewModel.findByIdAndDelete(id);

    // Update product rating
    await this.updateProductRating(review.productId.toString());

    return { success: true };
  }

  async getUserReviewableProducts(userId: string): Promise<any[]> {
    // Find completed and delivered orders for the user
    const completedOrders = await this.orderModel.find({
      userId: new Types.ObjectId(userId),
      paymentStatus: PaymentStatus.COMPLETED,
      shippingStatus: ShippingStatus.DELIVERED,
    });

    if (!completedOrders.length) {
      return [];
    }

    // Extract all product IDs from completed orders
    const productItems = completedOrders.flatMap((order) =>
      order.items.map((item) => ({
        productId: item.productId,
      })),
    );

    // Get unique product IDs
    const uniqueProductIds = [...new Set(productItems.map((item) => item.productId.toString()))];

    // Find products that have already been reviewed
    const reviewedProducts = await this.reviewModel.find({
      userId: new Types.ObjectId(userId),
      productId: { $in: uniqueProductIds.map((id) => new Types.ObjectId(id)) },
    });

    const reviewedProductIds = new Set(reviewedProducts.map((review) => review.productId.toString()));

    // Filter out products that have already been reviewed
    const reviewableProductIds = uniqueProductIds.filter((id) => !reviewedProductIds.has(id));

    // Get product details for reviewable products
    const products = await this.productModel.find({
      _id: { $in: reviewableProductIds.map((id) => new Types.ObjectId(id)) },
    });

    // Combine product details
    return products.map((product) => ({
      productId: product._id,
      name: product.name,
      image: product.images && product.images.length > 0 ? product.images[0] : null,
      price: product.originalPrice,
    }));
  }

  private async updateProductRating(productId: string): Promise<void> {
    // Get all active reviews for the product
    const reviews = await this.reviewModel.find({
      productId: new Types.ObjectId(productId),
      isActive: true,
    });

    // Calculate average rating
    let averageRating = 0;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      averageRating = parseFloat((totalRating / reviews.length).toFixed(1));
    }

    // Update product with new rating and review count
    await this.productModel.findByIdAndUpdate(productId, {
      averageRating,
      reviewCount: reviews.length,
    });
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    productId?: string;
    userId?: string;
    rating?: number;
    isActive?: boolean;
  }) {
    const { page = 1, limit = 10, productId, userId, rating, isActive } = options;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (productId) {
      query.productId = new Types.ObjectId(productId);
    }

    if (userId) {
      query.userId = new Types.ObjectId(userId);
    }

    if (rating) {
      query.rating = rating;
    }

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const [items, total] = await Promise.all([
      this.reviewModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username email avatar')
        .populate('productId', 'name slug images')
        .lean(),
      this.reviewModel.countDocuments(query),
    ]);

    const reviews = items.map((item) => {
      const { userId, productId, ...rest } = item;
      return {
        ...rest,
        user: userId,
        product: productId,
      };
    });

    return {
      items: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
