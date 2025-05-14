import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '@/database/schemas/category.schema';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const created = new this.categoryModel(createCategoryDto);
    return created.save();
  }

  async findAll(options: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    const { page = 1, limit = 10, search, isActive } = options;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    if (search) {
      query.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    }

    const [items, total] = await Promise.all([
      this.categoryModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      this.categoryModel.countDocuments(query),
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

  async findOne(id: string, options: { isActive?: boolean } = {}) {
    const query: any = { _id: id };
    if (options.isActive !== undefined) {
      query.isActive = options.isActive;
    }

    const category = await this.categoryModel.findOne(query);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const updated = await this.categoryModel.findByIdAndUpdate(id, updateCategoryDto, { new: true });
    if (!updated) {
      throw new NotFoundException('Category not found');
    }
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.categoryModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException('Category not found');
    }
    return deleted;
  }

  async findProducts(
    id: string,
    options: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: 'asc' | 'desc';
    },
  ) {
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = options;
    const skip = (page - 1) * limit;

    // First verify category exists and is active
    await this.findOne(id, { isActive: true });

    // This would need to be adjusted based on your Product schema and relationships
    const products = await this.categoryModel
      .aggregate([
        { $match: { _id: id, isActive: true } },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'categories',
            as: 'products',
          },
        },
        { $unwind: '$products' },
        { $match: { 'products.isActive': true } },
        { $skip: skip },
        { $limit: limit },
        { $sort: { [`products.${sort}`]: order === 'desc' ? -1 : 1 } },
      ])
      .exec();

    return {
      items: products,
      meta: {
        page,
        limit,
        // You might want to add total count here
      },
    };
  }
}
