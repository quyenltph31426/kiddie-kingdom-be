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

    if (categoryId) {
      query.categories = new Types.ObjectId(categoryId);
    }

    if (brandId) {
      query.brandId = new Types.ObjectId(brandId);
    }

    // Validate price values before using them in the query
    // if (minPrice || maxPrice) {
    //   query['variants.price'] = {};

    //   if (minPrice) {
    //     query['variants.price'].$gte = Number(minPrice);
    //   }

    //   if (maxPrice) {
    //     query['variants.price'].$lte = Number(maxPrice);
    //   }
    // }

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

    const [items, total] = await Promise.all([
      this.productModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .populate('categories', 'name slug')
        .populate('primaryCategoryId', 'name slug')
        .populate('brandId', 'name slug')
        .select('name slug images variants originalPrice'),
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
      items: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
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

    // Apply date-based availability filters
    const now = new Date();
    query.$or = [{ availableFrom: { $exists: false } }, { availableFrom: null }, { availableFrom: { $lte: now } }];

    query.$and = [
      {
        $or: [{ availableTo: { $exists: false } }, { availableTo: null }, { availableTo: { $gte: now } }],
      },
    ];

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
      $or: [{ availableFrom: { $exists: false } }, { availableFrom: null }, { availableFrom: { $lte: now } }],
      $and: [
        {
          $or: [{ availableTo: { $exists: false } }, { availableTo: null }, { availableTo: { $gte: now } }],
        },
      ],
    };

    const products = await this.productModel
      .find(query)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('primaryCategoryId', 'name slug')
      .populate('brandId', 'name slug');

    // Check favorite status if userId is provided
    if (userId) {
      const productIds = products.map((p) => p._id);
      const favorites = await this.favoriteModel.find({
        userId: new Types.ObjectId(userId),
        productId: { $in: productIds },
      });

      const favoriteSet = new Set(favorites.map((f) => f.productId.toString()));

      return products.map((product) => {
        const result = product.toObject ? product.toObject() : product;
        result.isFavorite = favoriteSet.has(product._id.toString());
        return result;
      });
    }

    return products;
  }

  async getBestSellerProducts(limit: number = 10, page: number = 1, userId: string | null = null) {
    const skip = (page - 1) * limit;
    const now = new Date();
    const query = {
      isActive: true,
      $or: [{ isBestSeller: true }, { totalSoldCount: { $gt: 0 } }],
      $and: [
        {
          $or: [{ availableFrom: { $exists: false } }, { availableFrom: null }, { availableFrom: { $lte: now } }],
        },
        {
          $or: [{ availableTo: { $exists: false } }, { availableTo: null }, { availableTo: { $gte: now } }],
        },
      ],
    };

    const [products, total] = await Promise.all([
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
    if (userId) {
      const productIds = products.map((p) => p._id);
      const favorites = await this.favoriteModel.find({
        userId: new Types.ObjectId(userId),
        productId: { $in: productIds },
      });

      const favoriteSet = new Set(favorites.map((f) => f.productId.toString()));

      return products.map((product) => {
        const result = product.toObject ? product.toObject() : product;
        result.isFavorite = favoriteSet.has(product._id.toString());
        return result;
      });
    }

    return {
      items: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getNewArrivalProducts(limit: number = 10, userId: string | null = null) {
    const now = new Date();
    const query = {
      isActive: true,
      isNewArrival: true,
      $or: [{ availableFrom: { $exists: false } }, { availableFrom: null }, { availableFrom: { $lte: now } }],
      $and: [
        {
          $or: [{ availableTo: { $exists: false } }, { availableTo: null }, { availableTo: { $gte: now } }],
        },
      ],
    };

    const products = await this.productModel
      .find(query)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('primaryCategoryId', 'name slug')
      .populate('brandId', 'name slug');

    // Check favorite status if userId is provided
    if (userId) {
      const productIds = products.map((p) => p._id);
      const favorites = await this.favoriteModel.find({
        userId: new Types.ObjectId(userId),
        productId: { $in: productIds },
      });

      const favoriteSet = new Set(favorites.map((f) => f.productId.toString()));

      return products.map((product) => {
        const result = product.toObject ? product.toObject() : product;
        result.isFavorite = favoriteSet.has(product._id.toString());
        return result;
      });
    }

    return products;
  }

  async getOnSaleProducts(limit: number = 10, page: number = 1, userId: string | null = null) {
    const skip = (page - 1) * limit;
    const now = new Date();
    const query = {
      isActive: true,
      isOnSale: true,
      $or: [{ availableFrom: { $exists: false } }, { availableFrom: null }, { availableFrom: { $lte: now } }],
      $and: [
        {
          $or: [{ availableTo: { $exists: false } }, { availableTo: null }, { availableTo: { $gte: now } }],
        },
      ],
    };

    const [products, total] = await Promise.all([
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
        productId: { $in: products.map((product) => product._id) },
      });
      favorites = new Set(userFavorites.map((fav) => fav.productId.toString()));
    }

    const productsWithFavoriteStatus = products.map((product) => {
      const result = product.toObject ? product.toObject() : product;
      result.isFavorite = favorites.has(product._id.toString());
      return result;
    });

    return {
      items: productsWithFavoriteStatus,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
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

    const [products, total] = await Promise.all([
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
    if (userId) {
      const productIds = products.map((p) => p._id);
      const favorites = await this.favoriteModel.find({
        userId: new Types.ObjectId(userId),
        productId: { $in: productIds },
      });

      const favoriteSet = new Set(favorites.map((f) => f.productId.toString()));

      return products.map((product) => {
        const result = product.toObject ? product.toObject() : product;
        result.isFavorite = favoriteSet.has(product._id.toString());
        return result;
      });
    }

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
