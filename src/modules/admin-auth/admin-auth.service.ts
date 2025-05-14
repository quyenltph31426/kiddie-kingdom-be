import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Admin, AdminDocument } from '@/database/schemas/admin.schema';
import { AdminSignInDto } from './dto/admin-auth.dto';
import { Hash } from '@/utils/Hash';
import { AdminCreateInDto } from './dto/create-admin.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signin(signInDto: AdminSignInDto) {
    const { identifier, password } = signInDto;

    // Find admin by email or username
    const admin = await this.adminModel.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
      isActive: true,
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = Hash.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(admin._id.toString(), admin.email, admin.role);

    return {
      user: {
        id: admin._id,
        email: admin.email,
        username: admin.username,
        role: admin.role,
        avatar: admin.avatar,
      },
      ...tokens,
    };
  }

  private async generateTokens(adminId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: adminId,
          email,
          role,
          type: 'ADMIN_ACCESS_TOKEN',
        },
        {
          secret: this.configService.get<string>('auth.secret'),
          expiresIn: this.configService.get<string>('auth.jwtExpires') + 'm',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: adminId,
          email,
          role,
          type: 'ADMIN_REFRESH_TOKEN',
        },
        {
          secret: this.configService.get<string>('auth.secret'),
          expiresIn: this.configService.get<string>('auth.refreshTokenTime') + 'm',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      accessTokenTtl: Number(this.configService.get<string>('auth.jwtExpires')),
      refreshTokenTtl: Number(this.configService.get<string>('auth.refreshTokenTime')),
    };
  }

  async getProfile(adminId: string) {
    const admin = await this.adminModel.findById(adminId);

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return {
      id: admin._id,
      email: admin.email,
      username: admin.username,
      role: admin.role,
      avatar: admin.avatar,
    };
  }

  async createAdmin(adminCreateDto: AdminCreateInDto) {
    const { email, username, password } = adminCreateDto;

    // Check if admin already exists
    const existingAdmin = await this.adminModel.findOne({ $or: [{ email }, { username }] });
    if (existingAdmin) {
      throw new UnauthorizedException('Email or username already exists');
    }

    // Create new admin
    const hashedPassword = Hash.make(password);
    const admin = await this.adminModel.create({
      email,
      username,
      password: hashedPassword,
    });

    return admin;
  }
}
