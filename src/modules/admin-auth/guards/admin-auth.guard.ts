import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ADMIN_ROLES_KEY } from '@/shared/decorator/adminRoles.decorator';
import { AdminRoles } from '@/shared/enums';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from '@/database/schemas/admin.schema';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private jwtService: JwtService,
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRoles[]>(ADMIN_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('auth.secret'),
      });

      const admin = await this.adminModel.findById(payload.sub);
      if (!admin) {
        throw new UnauthorizedException('Admin not found');
      }

      // Check if the admin is active
      if (!admin.isActive) {
        throw new ForbiddenException('Admin account is inactive');
      }

      // Check if the admin has the required role
      // if (requiredRoles && !requiredRoles.includes(payload.role)) {
      //   throw new ForbiddenException('Insufficient permissions');
      // }

      // Attach admin to request
      request.admin = payload;
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Invalid token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
