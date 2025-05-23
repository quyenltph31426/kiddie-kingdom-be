import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { User, UserDocument } from '@/database/schemas/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserStatus } from '@/shared/interfaces';
import { Hash } from '@/utils/Hash';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, username, password } = createUserDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new BadRequestException('Email or username already exists');
    }

    // Hash password
    const hashedPassword = Hash.make(password);

    // Create new user
    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    return user.save();
  }

  async findAll(options: { page?: number; limit?: number; search?: string; status?: UserStatus }) {
    const { page = 1, limit = 10, search, status } = options;

    const skip = (page - 1) * limit;
    const query: any = {};

    if (status) {
      query.isActive = status === UserStatus.ACTIVE;
    }

    if (search) {
      query.$or = [{ username: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    }

    const [users, total] = await Promise.all([
      this.userModel.find(query).select('-password').skip(skip).limit(limit).sort({ createdAt: -1 }),
      this.userModel.countDocuments(query),
    ]);

    return {
      items: users,
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
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(id).select('-password');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    // If password is provided, hash it
    if (updateUserDto.password) {
      updateUserDto.password = Hash.make(updateUserDto.password);
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).select('-password');

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async remove(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const deletedUser = await this.userModel.findByIdAndDelete(id);

    if (!deletedUser) {
      throw new NotFoundException('User not found');
    }

    return { success: true, message: 'User deleted successfully' };
  }

  async changeStatus(id: string, status: UserStatus) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const isActive = status === UserStatus.ACTIVE;

    const updatedUser = await this.userModel.findByIdAndUpdate(id, { isActive }, { new: true }).select('-password');

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    // Find user with password field
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = Hash.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash and update new password
    const hashedPassword = Hash.make(newPassword);
    user.password = hashedPassword;
    await user.save();

    return { success: true, message: 'Password updated successfully' };
  }
}
