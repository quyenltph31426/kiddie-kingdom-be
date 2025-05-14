import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { Admin, AdminSchema } from '@/database/schemas/admin.schema';
import { ConfigModule } from '@nestjs/config';
import { AdminAuthGuard } from './guards/admin-auth.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminAuthGuard],
  exports: [AdminAuthGuard], // Export for use in other modules
})
export class AdminAuthModule {}
