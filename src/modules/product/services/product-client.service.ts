import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Product, ProductDocument } from '@/database/schemas/product.schema';
import { ProductFavorite, ProductFavoriteDocument } from '@/database/schemas/product-favorite.schema';
import { UpdateProductStatsDto } from '../dto/update-product-stats.dto';
import { isValidNumber } from '@/utils/common';
import { PaginationResponse } from '@/config/rest/paginationResponse';

@Injectable()
export class ProductClientService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductFavorite.name) private favoriteModel: Model<ProductFavoriteDocument>,
  ) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    brandId?: string;
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    userId?: string | null;
  }) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      userId = null,
    } = options;

    const skip = (page - 1) * limit;
    const query: any = { isActive: true };

    // Kiểm tra và xử lý categoryId
    if (categoryId && isValidObjectId(categoryId)) {
      query.categories = new Types.ObjectId(categoryId);
    } else if (categoryId) {
    }

    // Kiểm tra và xử lý brandId
    if (brandId && isValidObjectId(brandId)) {
      query.brandId = new Types.ObjectId(brandId);
    } else if (brandId) {
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brandName: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    // Prepare sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Filter by price using aggregation pipeline
    let pipeline = [];

    // Start with matching basic criteria
    pipeline.push({ $match: query });

    // Add price filtering
    if (minPrice !== undefined || maxPrice !== undefined) {
      pipeline.push(
        // Calculate current price for each product
        {
          $addFields: {
            currentPrice: {
              $min: '$variants.price',
            },
          },
        },
      );

      // Apply price filters
      const priceFilter: any = {};
      if (minPrice !== undefined) {
        priceFilter.$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        priceFilter.$lte = maxPrice;
      }

      pipeline.push({ $match: { currentPrice: priceFilter } });
    }

    // Add pagination, sorting, and populate
    pipeline.push({ $skip: skip }, { $limit: limit }, { $sort: sort });

    // If no price filtering, use the regular find method
    let items;
    if (minPrice === undefined && maxPrice === undefined) {
      items = await this.productModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .populate('categories', 'name slug')
        .populate('primaryCategoryId', 'name slug')
        .populate('brandId', 'name slug')
        .select('name slug images variants originalPrice');
    } else {
      // Use aggregation pipeline with price filtering
      items = await this.productModel.aggregate(pipeline).exec();

      // Manually populate references after aggregation
      await this.productModel.populate(items, [
        { path: 'categories', select: 'name slug' },
        { path: 'primaryCategoryId', select: 'name slug' },
        { path: 'brandId', select: 'name slug' },
      ]);
    }

    // Get total count (needs to account for price filtering)
    let total;
    if (minPrice === undefined && maxPrice === undefined) {
      total = await this.productModel.countDocuments(query);
    } else {
      // Count with price filtering
      const countPipeline = pipeline.slice(
        0,
        pipeline.findIndex((stage) => '$skip' in stage),
      );
      const countResult = await this.productModel.aggregate([...countPipeline, { $count: 'total' }]).exec();
      total = countResult.length > 0 ? countResult[0].total : 0;
    }

    // Check favorite status if userId is provided
    let favorites = new Set<string>();
    if (userId) {
      const userFavorites = await this.favoriteModel.find({
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
        variants: variants.map((variant) => ({
          sku: variant.sku,
          price: variant.price,
          quantity: variant.quantity,
          attributes: variant.attributes,
          _id: variant._id,
        })),
      };
    });

    return {
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      items: products,
    };
  }

  async findOne(idOrSlug: string, userId: string | null = null) {
    const query: any = { isActive: true };

    // Check if the provided string is a valid MongoDB ObjectId
    if (isValidObjectId(idOrSlug)) {
      query._id = idOrSlug;
    } else {
      query.slug = idOrSlug;
    }

    const product = await this.productModel
      .findOne(query)
      .populate('categories', 'name slug')
      .populate('primaryCategoryId', 'name slug')
      .populate('brandId', 'name slug');

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Increment view count
    await this.productModel.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } });

    // Check if product is favorited by user
    const result = product.toObject ? product.toObject() : product;
    if (userId) {
      const isFavorite = await this.favoriteModel.exists({
        userId: new Types.ObjectId(userId),
        productId: product._id,
      });
      result.isFavorite = !!isFavorite;
    }

    const currentPrice = Math.min(...result.variants.map((variant) => variant.price));

    const productResult = {
      ...result,
      totalSoldCount: result.variants.reduce((acc, variant) => acc + (variant.soldCount || 0), 0),
      variants: result.variants.map((variant) => ({
        sku: variant.sku,
        price: variant.price,
        quantity: variant.quantity,
        attributes: variant.attributes,
        _id: variant._id,
      })),
      primaryCategory: result.primaryCategoryId,
      brand: result.brandId,
      totalQuantity: result.variants.reduce((acc, variant) => acc + variant.quantity, 0),
      currentPrice,
    };
    return productResult;
  }

  async getFeaturedProducts(limit: number = 10, userId: string | null = null) {
    const now = new Date();

    const query = {
      isActive: true,
      isFeatured: true,
    };

    const [items, total] = await Promise.all([
      this.productModel
        .find(query)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('primaryCategoryId', 'name slug')
        .populate('brandId', 'name slug'),
      this.productModel.countDocuments(query),
    ]);

    // Check favorite status if userId is provided
    let favorites = new Set<string>();
    if (userId) {
      const userFavorites = await this.favoriteModel.find({
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
        variants: variants.map((variant) => ({
          sku: variant.sku,
          price: variant.price,
          quantity: variant.quantity,
          attributes: variant.attributes,
          _id: variant._id,
        })),
      };
    });

    return {
      meta: {
        total,
        page: 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      items: products,
    };
  }

  async getBestSellerProducts(limit: number = 10, page: number = 1, userId: string | null = null) {
    // Đảm bảo limit và page là số nguyên hợp lệ
    const validLimit = Math.max(1, Math.floor(Number(limit) || 10));
    const validPage = Math.max(1, Math.floor(Number(page) || 1));
    const skip = (validPage - 1) * validLimit;

    const query = {
      isActive: true,
      $or: [{ isBestSeller: true }, { 'variants.soldCount': { $gt: 0 } }],
    };

    // Sử dụng aggregation để tính tổng soldCount từ variants
    const aggregationPipeline: any[] = [
      { $match: query },
      {
        $addFields: {
          calculatedTotalSoldCount: {
            $sum: {
              $map: {
                input: '$variants',
                as: 'variant',
                in: { $ifNull: ['$$variant.soldCount', 0] },
              },
            },
          },
        },
      },
      { $sort: { calculatedTotalSoldCount: -1, viewCount: -1 } },
      { $skip: skip },
      { $limit: validLimit },
    ];

    const [items, totalCount] = await Promise.all([
      this.productModel.aggregate(aggregationPipeline),
      this.productModel.countDocuments(query),
    ]);

    // Populate references manually after aggregation
    await this.productModel.populate(items, [
      { path: 'categories', select: 'name slug' },
      { path: 'primaryCategoryId', select: 'name slug' },
      { path: 'brandId', select: 'name slug' },
    ]);

    // Check favorite status if userId is provided
    let favorites = new Set<string>();
    if (userId) {
      const userFavorites = await this.favoriteModel.find({
        userId: new Types.ObjectId(userId),
        productId: { $in: items.map((item) => item._id) },
      });
      favorites = new Set(userFavorites.map((fav) => fav.productId.toString()));
    }

    const products = items.map((product) => {
      if (userId) {
        product.isFavorite = favorites.has(product._id.toString());
      }

      const { primaryCategoryId, brandId, variants, calculatedTotalSoldCount, ...rest } = product;

      return {
        ...rest,
        primaryCategory: primaryCategoryId,
        brand: brandId,
        currentPrice: Math.min(...variants.map((variant) => variant.price)),
        totalQuantity: variants.reduce((acc, variant) => acc + variant.quantity, 0),
        totalSoldCount: calculatedTotalSoldCount,
        variants: variants.map((variant) => ({
          sku: variant.sku,
          price: variant.price,
          quantity: variant.quantity,
          attributes: variant.attributes,
          _id: variant._id,
        })),
      };
    });

    return {
      items: products,
      meta: {
        total: totalCount,
        page: validPage,
        limit: validLimit,
        totalPages: Math.ceil(totalCount / validLimit),
      },
    };
  }

  async getNewArrivalProducts(limit: number = 10, page: number = 1, userId: string | null = null) {
    const skip = (page - 1) * limit;
    const now = new Date();
    const tenDaysAgo = new Date(new Date().setDate(now.getDate() - 10));

    const query = {
      isActive: true,
      isNewArrival: true,
      createdAt: {
        $gte: tenDaysAgo,
        $lte: now,
      },
    };

    const [items, total] = await Promise.all([
      this.productModel
        .find(query)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('primaryCategoryId', 'name slug')
        .populate('brandId', 'name slug'),
      this.productModel.countDocuments(query),
    ]);

    // Check favorite status if userId is provided
    let favorites = new Set<string>();
    if (userId) {
      const userFavorites = await this.favoriteModel.find({
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
        variants: variants.map((variant) => ({
          sku: variant.sku,
          price: variant.price,
          quantity: variant.quantity,
          attributes: variant.attributes,
          _id: variant._id,
        })),
      };
    });

    return {
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      items: products,
    };
  }

  async getOnSaleProducts(limit: number = 10, page: number = 1, userId: string | null = null) {
    const skip = (page - 1) * limit;
    const now = new Date();
    const query = {
      isActive: true,
      isOnSale: true,
    };

    const [items, total] = await Promise.all([
      this.productModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('primaryCategoryId', 'name slug')
        .populate('brandId', 'name slug'),
      this.productModel.countDocuments(query),
    ]);

    // Check favorite status if userId is provided
    let favorites = new Set<string>();
    if (userId) {
      const userFavorites = await this.favoriteModel.find({
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
        variants: variants.map((variant) => ({
          sku: variant.sku,
          price: variant.price,
          quantity: variant.quantity,
          attributes: variant.attributes,
          _id: variant._id,
        })),
      };
    });

    return {
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      items: products,
    };
  }

  async getRelatedProducts(productId: string, limit: number = 10, page: number = 1, userId: string | null = null) {
    const skip = (page - 1) * limit;
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const now = new Date();
    const query = {
      _id: { $ne: product._id },
      isActive: true,
      $or: [
        { primaryCategoryId: product.primaryCategoryId },
        { categories: { $in: product.categories } },
        { brandId: product.brandId },
        { tags: { $in: product.tags } },
      ],
    };

    const [items, total] = await Promise.all([
      this.productModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ totalSoldCount: -1, viewCount: -1 })
        .populate('primaryCategoryId', 'name slug')
        .populate('brandId', 'name slug'),
      this.productModel.countDocuments(query),
    ]);

    // Check favorite status if userId is provided
    let favorites = new Set<string>();
    if (userId) {
      const userFavorites = await this.favoriteModel.find({
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
        variants: variants.map((variant) => ({
          sku: variant.sku,
          price: variant.price,
          quantity: variant.quantity,
          attributes: variant.attributes,
          _id: variant._id,
        })),
      };
    });

    return {
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      items: products,
    };
  }

  async incrementProductStats(id: string, statsDto: UpdateProductStatsDto) {
    const updateData: any = { $inc: {} };

    if (statsDto.viewCountIncrement) {
      updateData.$inc.viewCount = statsDto.viewCountIncrement;
    }

    if (statsDto.totalSoldCountIncrement) {
      updateData.$inc.totalSoldCount = statsDto.totalSoldCountIncrement;
    }

    if (statsDto.reviewCountIncrement) {
      updateData.$inc.reviewCount = statsDto.reviewCountIncrement;
    }

    if (statsDto.averageRating !== undefined) {
      updateData.$set = { averageRating: statsDto.averageRating };
    }

    if (Object.keys(updateData.$inc).length === 0 && !updateData.$set) {
      return this.findOne(id);
    }

    const updated = await this.productModel.findByIdAndUpdate(id, updateData, { new: true });

    if (!updated) {
      throw new NotFoundException('Product not found');
    }

    return updated;
  }
}
