import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminSignInDto } from './dto/admin-auth.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { Admin } from '@/shared/decorator/admin.decorator';
import { AdminCreateInDto } from './dto/create-admin.dto';

@ApiTags('Admin Authentication')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('signin')
  @ApiOperation({ summary: 'Admin sign in' })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    schema: {
      example: {
        admin: {
          id: '65f2d4a12345678901234567',
          email: 'admin@example.com',
          username: 'admin',
          role: 'ADMIN',
          avatar: 'https://example.com/avatar.jpg',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      },
    },
  })
  signin(@Body() signInDto: AdminSignInDto) {
    return this.adminAuthService.signin(signInDto);
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Get current admin profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns current admin profile',
    schema: {
      example: {
        id: '65f2d4a12345678901234567',
        email: 'admin@example.com',
        username: 'admin',
        role: 'ADMIN',
        avatar: 'https://example.com/avatar.jpg',
      },
    },
  })
  async getProfile(@Admin() admin: any) {
    return this.adminAuthService.getProfile(admin.sub);
  }

  @Post('/create-admin')
  // @UseGuards(AdminAuthGuard)
  async createAdmin(@Body() createAdminDto: AdminCreateInDto) {
    return await this.adminAuthService.createAdmin(createAdminDto);
  }
}
