import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '@/database/schemas/product.schema';
import { Category, CategoryDocument } from '@/database/schemas/category.schema';
import { Brand, BrandDocument } from '@/database/schemas/brand.schema';
import { ProductFavorite, ProductFavoriteDocument } from '@/database/schemas/product-favorite.schema';
import { SearchQueryDto, SearchType } from '../dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Brand.name) private brandModel: Model<BrandDocument>,
    @InjectModel(ProductFavorite.name) private productFavoriteModel: Model<ProductFavoriteDocument>,
  ) {}

  async search(searchDto: SearchQueryDto, userId: string | null = null) {
    const { query, type, page, limit } = searchDto;
    const skip = (page - 1) * limit;

    // Prepare response object
    const result: any = {
      query,
      type,
    };

    // Search based on type
    if (type === SearchType.ALL || type === SearchType.PRODUCTS) {
      const products = await this.searchProducts(query, skip, limit, userId);
      result.products = products;
    }

    if (type === SearchType.ALL || type === SearchType.CATEGORIES) {
      const categories = await this.searchCategories(query, skip, limit);
      result.categories = categories;
    }

    if (type === SearchType.ALL || type === SearchType.BRANDS) {
      const brands = await this.searchBrands(query, skip, limit);
      result.brands = brands;
    }

    return result;
  }

  private async searchProducts(query: string, skip: number, limit: number, userId: string | null = null) {
    const searchQuery = {
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { brandName: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } },
      ],
    };

    const [items, total] = await Promise.all([
      this.productModel
        .find(searchQuery)
        .skip(skip)
        .limit(limit)
        .sort({ viewCount: -1, createdAt: -1 })
        .populate('primaryCategoryId', 'name slug')
        .populate('brandId', 'name slug')
        .select('name slug images variants originalPrice averageRating reviewCount'),
      this.productModel.countDocuments(searchQuery),
    ]);

    // Check favorite status if userId is provided
    let favorites = new Set<string>();
    if (userId) {
      const userFavorites = await this.productFavoriteModel.find({
        userId: new Types.ObjectId(userId),
        productId: { $in: items.map((item) => item._id) },
      });
      favorites = new Set(userFavorites.map((fav) => fav.productId.toString()));
    }

    const products = items.map((item) => {
      const product = item.toObject ? item.toObject() : item;
      if (userId) {
        product.isFavorite = favorites.has(item._id.toString());
      }

      const { primaryCategoryId, brandId, variants, ...rest } = product;

      return {
        ...rest,
        primaryCategory: primaryCategoryId,
        brand: brandId,
        currentPrice: Math.min(...variants.map((variant) => variant.price)),
        totalQuantity: variants.reduce((acc, variant) => acc + variant.quantity, 0),
        totalSoldCount: variants.reduce((acc, variant) => acc + (variant.soldCount || 0), 0),
      };
    });

    return {
      items: products,
      meta: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async searchCategories(query: string, skip: number, limit: number) {
    const searchQuery = {
      isActive: true,
      $or: [{ name: { $regex: query, $options: 'i' } }, { description: { $regex: query, $options: 'i' } }],
    };

    const [items, total] = await Promise.all([
      this.categoryModel
        .find(searchQuery)
        .skip(skip)
        .limit(limit)
        .sort({ name: 1 })
        .select('name slug description image'),
      this.categoryModel.countDocuments(searchQuery),
    ]);

    return {
      items,
      meta: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async searchBrands(query: string, skip: number, limit: number) {
    const searchQuery = {
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { country: { $regex: query, $options: 'i' } },
      ],
    };

    const [items, total] = await Promise.all([
      this.brandModel
        .find(searchQuery)
        .skip(skip)
        .limit(limit)
        .sort({ name: 1 })
        .select('name slug description logo country'),
      this.brandModel.countDocuments(searchQuery),
    ]);

    return {
      items,
      meta: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
