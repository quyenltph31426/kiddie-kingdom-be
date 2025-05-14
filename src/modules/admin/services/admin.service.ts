import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Admin, AdminDocument } from '@/database/schemas/admin.schema';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { AdminStatus } from '@/shared/enums';
import { Hash } from '@/utils/Hash';
import { UpdateAdminDto } from '../dto/update-admin.dto';

@Injectable()
export class AdminService {
  constructor(@InjectModel(Admin.name) private adminModel: Model<AdminDocument>) {}

  async create(createAdminDto: CreateAdminDto): Promise<Admin> {
    const { email, username, password } = createAdminDto;

    // Check if admin already exists
    const existingAdmin = await this.adminModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existingAdmin) {
      throw new BadRequestException('Email or username already exists');
    }

    // Hash password
    const hashedPassword = Hash.make(password);

    // Create new admin
    const admin = new this.adminModel({
      ...createAdminDto,
      password: hashedPassword,
    });

    return admin.save();
  }

  async findAll(options: { page?: number; limit?: number; search?: string; status?: AdminStatus }) {
    const { page = 1, limit = 10, search, status } = options;

    const skip = (page - 1) * limit;
    const query: any = {};

    if (status !== undefined) {
      query.isActive = status === AdminStatus.ACTIVE;
    }

    if (search) {
      query.$or = [{ username: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    }

    const [admins, total] = await Promise.all([
      this.adminModel.find(query).select('-password').skip(skip).limit(limit).sort({ createdAt: -1 }),
      this.adminModel.countDocuments(query),
    ]);

    return {
      items: admins,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid admin ID');
    }

    const admin = await this.adminModel.findById(id).select('-password');

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return admin;
  }

  async update(id: string, updateAdminDto: UpdateAdminDto) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid admin ID');
    }

    // If password is provided, hash it
    if (updateAdminDto.password) {
      updateAdminDto.password = Hash.make(updateAdminDto.password);
    }

    const updatedAdmin = await this.adminModel.findByIdAndUpdate(id, updateAdminDto, { new: true }).select('-password');

    if (!updatedAdmin) {
      throw new NotFoundException('Admin not found');
    }

    return updatedAdmin;
  }

  async remove(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid admin ID');
    }

    const deletedAdmin = await this.adminModel.findByIdAndDelete(id);

    if (!deletedAdmin) {
      throw new NotFoundException('Admin not found');
    }

    return { success: true, message: 'Admin deleted successfully' };
  }

  async changeStatus(id: string, status: AdminStatus) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid admin ID');
    }

    const isActive = status === AdminStatus.ACTIVE;

    const updatedAdmin = await this.adminModel.findByIdAndUpdate(id, { isActive }, { new: true }).select('-password');

    if (!updatedAdmin) {
      throw new NotFoundException('Admin not found');
    }

    return updatedAdmin;
  }
}
