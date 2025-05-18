import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Voucher, VoucherDocument, VoucherStatus, VoucherType } from '@/database/schemas/voucher.schema';
import { CreateVoucherDto } from '../dto/create-voucher.dto';
import { UpdateVoucherDto } from '../dto/update-voucher.dto';
import { VerifyVoucherDto } from '../dto/verify-voucher.dto';

@Injectable()
export class VoucherService {
  constructor(@InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>) {}

  async create(createVoucherDto: CreateVoucherDto): Promise<Voucher> {
    // Check if voucher code already exists
    const existingVoucher = await this.voucherModel.findOne({ code: createVoucherDto.code });
    if (existingVoucher) {
      throw new BadRequestException('Voucher code already exists');
    }

    const createdVoucher = new this.voucherModel({
      ...createVoucherDto,
      startDate: new Date(createVoucherDto.startDate),
      endDate: new Date(createVoucherDto.endDate),
    });

    return createdVoucher.save();
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: VoucherStatus;
    isActive?: boolean;
  }) {
    const { page = 1, limit = 10, search, status, isActive } = options;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (search) {
      query.$or = [{ code: { $regex: search, $options: 'i' } }, { name: { $regex: search, $options: 'i' } }];
    }

    if (status) {
      query.status = status;
    }

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const [vouchers, total] = await Promise.all([
      this.voucherModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.voucherModel.countDocuments(query),
    ]);

    return {
      items: vouchers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Voucher> {
    const voucher = await this.voucherModel.findById(id);

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    return voucher;
  }

  async update(id: string, updateVoucherDto: UpdateVoucherDto): Promise<Voucher> {
    // Check if voucher exists
    const voucher = await this.voucherModel.findById(id);
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    // Check if code is being changed and if it already exists
    if (updateVoucherDto.code && updateVoucherDto.code !== voucher.code) {
      const existingVoucher = await this.voucherModel.findOne({ code: updateVoucherDto.code });
      if (existingVoucher) {
        throw new BadRequestException('Voucher code already exists');
      }
    }

    // Convert date strings to Date objects if provided
    const updateData: any = { ...updateVoucherDto };
    if (updateVoucherDto.startDate) {
      updateData.startDate = new Date(updateVoucherDto.startDate);
    }
    if (updateVoucherDto.endDate) {
      updateData.endDate = new Date(updateVoucherDto.endDate);
    }

    const updatedVoucher = await this.voucherModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return updatedVoucher;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const result = await this.voucherModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Voucher not found');
    }

    return { success: true };
  }

  async verifyVoucherByCode(code: string, orderAmount: number) {
    // Find voucher by code
    const voucher = await this.voucherModel.findOne({ code });

    if (!voucher) {
      return { valid: false, message: 'Voucher not found' };
    }

    // Check if voucher is active
    if (!voucher.isActive) {
      return { valid: false, message: 'Voucher is inactive' };
    }

    // Check if voucher is expired
    const now = new Date();
    if (voucher.endDate < now) {
      return { valid: false, message: 'Voucher has expired' };
    }

    // Check if voucher is not yet valid
    if (voucher.startDate > now) {
      return { valid: false, message: 'Voucher is not yet valid' };
    }

    // Check if voucher has reached usage limit
    if (voucher.usageLimit > 0 && voucher.usageCount >= voucher.usageLimit) {
      return { valid: false, message: 'Voucher usage limit reached' };
    }

    // Check if order meets minimum value requirement
    if (voucher.minOrderValue > 0 && orderAmount < voucher.minOrderValue) {
      return {
        valid: false,
        message: `Order amount must be at least ${voucher.minOrderValue} to use this voucher`,
      };
    }

    // Calculate discount amount
    let discountAmount = 0;

    if (voucher.type === VoucherType.PERCENTAGE) {
      discountAmount = (orderAmount * voucher.value) / 100;

      // Apply maximum discount if set
      if (voucher.maxDiscountValue && discountAmount > voucher.maxDiscountValue) {
        discountAmount = voucher.maxDiscountValue;
      }
    } else if (voucher.type === VoucherType.FIXED_AMOUNT) {
      discountAmount = voucher.value;

      // Ensure discount doesn't exceed order amount
      if (discountAmount > orderAmount) {
        discountAmount = orderAmount;
      }
    }

    return {
      valid: true,
      voucher,
      discountAmount,
    };
  }

  async applyVoucherById(voucherId: string): Promise<Voucher> {
    const voucher = await this.voucherModel.findById(voucherId);

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    // Increment usage count
    voucher.usageCount += 1;
    await voucher.save();

    return voucher;
  }

  async getActiveVouchers(): Promise<Voucher[]> {
    const now = new Date();

    return this.voucherModel.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      status: VoucherStatus.ACTIVE,
    });
  }

  async findByCode(code: string): Promise<Voucher> {
    const voucher = await this.voucherModel.findOne({ code });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    return voucher;
  }
}
