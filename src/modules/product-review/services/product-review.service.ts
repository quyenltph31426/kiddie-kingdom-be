import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductReview, ProductReviewDocument } from '@/database/schemas/product-review.schema';
import { Product, ProductDocument } from '@/database/schemas/product.schema';
import { Order, OrderDocument } from '@/database/schemas/order.schema';
import { CreateProductReviewDto } from '../dto/create-product-review.dto';
import { UpdateProductReviewDto } from '../dto/update-product-review.dto';
import { AdminUpdateReviewDto } from '../dto/admin-update-review.dto';

@Injectable()
export class ProductReviewService {
  constructor(
    @InjectModel(ProductReview.name) private reviewModel: Model<ProductReviewDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async create(userId: string, createReviewDto: CreateProductReviewDto): Promise<ProductReview> {
    const { productId, orderId, orderItemId, rating, comment, images } = createReviewDto;

    // Check if product exists
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if order exists and belongs to the user
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });

    if (!order) {
      throw new NotFoundException('Order not found or does not belong to you');
    }

    // Check if order is completed (paid)
    if (order.status !== 'COMPLETED') {
      throw new BadRequestException('You can only review products from completed orders');
    }

    // Check if the product is in the order
    const orderContainsProduct = order.items.some(
      (item) => item.productId.toString() === productId && (!orderItemId || item._id.toString() === orderItemId),
    );

    if (!orderContainsProduct) {
      throw new BadRequestException('This product is not in the specified order');
    }

    // Check if user already reviewed this product for this order
    const existingReview = await this.reviewModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
      orderId: new Types.ObjectId(orderId),
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product for this order');
    }

    // Create the review
    const review = new this.reviewModel({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
      orderId: new Types.ObjectId(orderId),
      orderItemId: orderItemId ? new Types.ObjectId(orderItemId) : undefined,
      rating,
      comment,
      images: images || [],
    });

    const savedReview = await review.save();

    // Update product rating
    await this.updateProductRating(productId);

    return savedReview;
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    productId?: string;
    userId?: string;
    rating?: number;
    isActive?: boolean;
  }): Promise<{ items: ProductReview[]; meta: any }> {
    const { page = 1, limit = 10, productId, userId, rating, isActive = true } = options;
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

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name avatar')
        .exec(),
      this.reviewModel.countDocuments(query),
    ]);

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
    // Find completed orders for the user
    const completedOrders = await this.orderModel.find({
      userId: new Types.ObjectId(userId),
      status: 'COMPLETED',
    });

    if (!completedOrders.length) {
      return [];
    }

    // Extract all product IDs from completed orders
    const orderIds = completedOrders.map((order) => order._id);
    const productItems = completedOrders.flatMap((order) =>
      order.items.map((item) => ({
        productId: item.productId,
        orderId: order._id,
        orderItemId: item._id,
      })),
    );

    // Find products that have already been reviewed
    const reviewedProducts = await this.reviewModel.find({
      userId: new Types.ObjectId(userId),
      orderId: { $in: orderIds },
    });

    const reviewedProductMap = new Map();
    reviewedProducts.forEach((review) => {
      const key = `${review.productId.toString()}-${review.orderId.toString()}`;
      reviewedProductMap.set(key, true);
    });

    // Filter out products that have already been reviewed
    const reviewableProducts = productItems.filter((item) => {
      const key = `${item.productId.toString()}-${item.orderId.toString()}`;
      return !reviewedProductMap.has(key);
    });

    // Get product details for reviewable products
    const productIds = [...new Set(reviewableProducts.map((item) => item.productId.toString()))];

    if (!productIds.length) {
      return [];
    }

    const products = await this.productModel.find({
      _id: { $in: productIds.map((id) => new Types.ObjectId(id)) },
    });

    const productMap = new Map();
    products.forEach((product) => {
      productMap.set(product._id.toString(), product);
    });

    // Combine product details with order information
    return reviewableProducts
      .map((item) => {
        const product = productMap.get(item.productId.toString());
        if (!product) return null;

        return {
          productId: item.productId,
          orderId: item.orderId,
          orderItemId: item.orderItemId,
          name: product.name,
          image: product.images && product.images.length > 0 ? product.images[0] : null,
          slug: product.slug,
        };
      })
      .filter(Boolean);
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
}
