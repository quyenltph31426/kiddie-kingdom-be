import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner, BannerDocument, BannerType } from '@/database/schemas/banner.schema';
import { CreateBannerDto } from '../dto/create-banner.dto';
import { UpdateBannerDto } from '../dto/update-banner.dto';

@Injectable()
export class BannerService {
  constructor(@InjectModel(Banner.name) private bannerModel: Model<BannerDocument>) {}

  async create(createBannerDto: CreateBannerDto): Promise<Banner> {
    const created = new this.bannerModel(createBannerDto);
    return created.save();
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    type?: BannerType;
    isActive?: boolean;
  }): Promise<{ items: Banner[]; meta: any }> {
    const { page = 1, limit = 10, type, isActive } = options;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive;

    const [items, total] = await Promise.all([
      this.bannerModel.find(query).sort({ type: 1, order: 1 }).skip(skip).limit(limit),
      this.bannerModel.countDocuments(query),
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

  async findOne(id: string): Promise<Banner> {
    const banner = await this.bannerModel.findById(id);
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    return banner;
  }

  async update(id: string, updateBannerDto: UpdateBannerDto): Promise<Banner> {
    const updated = await this.bannerModel.findByIdAndUpdate(id, updateBannerDto, {
      new: true,
    });
    if (!updated) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.bannerModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    return { deleted: true };
  }

  async getActiveBanners(type?: BannerType): Promise<Banner[]> {
    const query: any = { isActive: true };
    if (type) {
      query.type = type;
    }

    return this.bannerModel.find(query).sort({ type: 1, order: 1 });
  }
}
