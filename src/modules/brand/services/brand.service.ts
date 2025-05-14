import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Brand, BrandDocument } from '@/database/schemas/brand.schema';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { UpdateBrandDto } from '../dto/update-brand.dto';

@Injectable()
export class BrandService {
  constructor(@InjectModel(Brand.name) private brandModel: Model<BrandDocument>) {}

  async create(createBrandDto: CreateBrandDto): Promise<Brand> {
    const created = new this.brandModel(createBrandDto);
    return created.save();
  }

  async findAll(options: { page?: number; limit?: number; search?: string; isActive?: boolean; isFeatured?: boolean }) {
    const { page = 1, limit = 10, search, isActive, isFeatured } = options;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.brandModel.find(query).skip(skip).limit(limit).sort({ name: 1 }),
      this.brandModel.countDocuments(query),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(idOrSlug: string, options: { isActive?: boolean } = {}) {
    const query: any = {};

    // Check if the provided string is a valid MongoDB ObjectId
    if (isValidObjectId(idOrSlug)) {
      query._id = idOrSlug;
    } else {
      query.slug = idOrSlug;
    }

    if (options.isActive !== undefined) {
      query.isActive = options.isActive;
    }

    const brand = await this.brandModel.findOne(query);
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return brand;
  }

  async update(id: string, updateBrandDto: UpdateBrandDto) {
    const updated = await this.brandModel.findByIdAndUpdate(id, updateBrandDto, { new: true });
    if (!updated) {
      throw new NotFoundException('Brand not found');
    }
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.brandModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException('Brand not found');
    }
    return deleted;
  }

  async getFeaturedBrands(limit: number = 10) {
    return this.brandModel.find({ isActive: true, isFeatured: true }).limit(limit).sort({ name: 1 });
  }

  async toggleFeatured(id: string, isFeatured: boolean) {
    const updated = await this.brandModel.findByIdAndUpdate(id, { isFeatured }, { new: true });
    if (!updated) {
      throw new NotFoundException('Brand not found');
    }
    return updated;
  }

  async toggleActive(id: string, isActive: boolean) {
    const updated = await this.brandModel.findByIdAndUpdate(id, { isActive }, { new: true });
    if (!updated) {
      throw new NotFoundException('Brand not found');
    }
    return updated;
  }
}
