import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '@/database/schemas/product.schema';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { UpdateProductStatsDto } from '../dto/update-product-stats.dto';

@Injectable()
export class ProductAdminService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const created = new this.productModel(createProductDto);
    return await created.save();
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    brandId?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    isOnSale?: boolean;
    isNewArrival?: boolean;
    isBestSeller?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      brandId,
      isActive,
      isFeatured,
      isOnSale,
      isNewArrival,
      isBestSeller,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const query: any = {};

    // Apply filters
    if (isActive !== undefined) query.isActive = isActive;
    if (isFeatured !== undefined) query.isFeatured = isFeatured;
    if (isOnSale !== undefined) query.isOnSale = isOnSale;
    if (isNewArrival !== undefined) query.isNewArrival = isNewArrival;
    if (isBestSeller !== undefined) query.isBestSeller = isBestSeller;

    if (categoryId) {
      query.categories = new Types.ObjectId(categoryId);
    }

    if (brandId) {
      query.brandId = new Types.ObjectId(brandId);
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
        .lean(),
      this.productModel.countDocuments(query),
    ]);

    const products = items.map((item) => {
      const { primaryCategoryId, brandId, variants, ...rest } = item;

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
      items: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.productModel
      .findById(id)
      .populate('categories', 'name slug')
      .populate('primaryCategoryId', 'name slug')
      .populate('brandId', 'name slug');

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const updated = await this.productModel.findByIdAndUpdate(id, updateProductDto, { new: true });

    if (!updated) {
      throw new NotFoundException('Product not found');
    }

    return updated;
  }

  async remove(id: string) {
    const deleted = await this.productModel.findByIdAndDelete(id);

    if (!deleted) {
      throw new NotFoundException('Product not found');
    }

    return deleted;
  }

  async updateStats(id: string, statsDto: UpdateProductStatsDto) {
    const updateData: any = {};

    if (statsDto.viewCountIncrement) {
      updateData.$inc = { ...updateData.$inc, viewCount: statsDto.viewCountIncrement };
    }

    if (statsDto.totalSoldCountIncrement) {
      updateData.$inc = { ...updateData.$inc, totalSoldCount: statsDto.totalSoldCountIncrement };
    }

    if (statsDto.reviewCountIncrement) {
      updateData.$inc = { ...updateData.$inc, reviewCount: statsDto.reviewCountIncrement };
    }

    if (statsDto.averageRating !== undefined) {
      updateData.$set = { ...updateData.$set, averageRating: statsDto.averageRating };
    }

    if (Object.keys(updateData).length === 0) {
      return this.findOne(id);
    }

    const updated = await this.productModel.findByIdAndUpdate(id, updateData, { new: true });

    if (!updated) {
      throw new NotFoundException('Product not found');
    }

    return updated;
  }

  async toggleFeatured(id: string, isFeatured: boolean) {
    const updated = await this.productModel.findByIdAndUpdate(id, { isFeatured }, { new: true });

    if (!updated) {
      throw new NotFoundException('Product not found');
    }

    return updated;
  }

  async toggleActive(id: string, isActive: boolean) {
    const updated = await this.productModel.findByIdAndUpdate(id, { isActive }, { new: true });

    if (!updated) {
      throw new NotFoundException('Product not found');
    }

    return updated;
  }

  async toggleOnSale(id: string, isOnSale: boolean) {
    const updated = await this.productModel.findByIdAndUpdate(id, { isOnSale }, { new: true });

    if (!updated) {
      throw new NotFoundException('Product not found');
    }

    return updated;
  }

  async toggleNewArrival(id: string, isNewArrival: boolean) {
    const updated = await this.productModel.findByIdAndUpdate(id, { isNewArrival }, { new: true });

    if (!updated) {
      throw new NotFoundException('Product not found');
    }

    return updated;
  }

  async toggleBestSeller(id: string, isBestSeller: boolean) {
    const updated = await this.productModel.findByIdAndUpdate(id, { isBestSeller }, { new: true });

    if (!updated) {
      throw new NotFoundException('Product not found');
    }

    return updated;
  }
}
