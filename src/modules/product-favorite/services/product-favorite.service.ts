import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductFavorite, ProductFavoriteDocument } from '@/database/schemas/product-favorite.schema';
import { Product, ProductDocument } from '@/database/schemas/product.schema';

@Injectable()
export class ProductFavoriteService {
  constructor(
    @InjectModel(ProductFavorite.name) private favoriteModel: Model<ProductFavoriteDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async toggleFavorite(userId: string, productId: string): Promise<{ isFavorite: boolean }> {
    // Check if product exists
    const productExists = await this.productModel.exists({ _id: productId });
    if (!productExists) {
      throw new NotFoundException('Product not found');
    }

    // Check if already favorited
    const existingFavorite = await this.favoriteModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });

    // If favorite exists, remove it
    if (existingFavorite) {
      await this.favoriteModel.deleteOne({ _id: existingFavorite._id });
      return { isFavorite: false };
    }

    // Otherwise, add it
    await this.favoriteModel.create({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });

    return { isFavorite: true };
  }

  async getFavorites(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.favoriteModel
        .find({ userId: new Types.ObjectId(userId) })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('productId', 'name slug images variants'),
      this.favoriteModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    // Transform the data to return product details
    const favorites = items.map((item) => ({
      ...item,
      product: item.productId,
    }));

    return {
      items: favorites,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async checkFavoriteStatus(userId: string, productId: string): Promise<{ isFavorite: boolean }> {
    const favorite = await this.favoriteModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });

    return { isFavorite: !!favorite };
  }

  async removeFavorite(userId: string, favoriteId: string) {
    const favorite = await this.favoriteModel.findOne({
      _id: new Types.ObjectId(favoriteId),
      userId: new Types.ObjectId(userId),
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.favoriteModel.deleteOne({ _id: favorite._id });
    return { success: true };
  }
}
