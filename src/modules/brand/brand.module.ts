import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Brand, BrandSchema } from '@/database/schemas/brand.schema';
import { BrandAdminController } from './controllers/admin/brand-admin.controller';
import { BrandClientController } from './controllers/client/brand-client.controller';
import { BrandService } from './services/brand.service';
import { JwtModule } from '@nestjs/jwt';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([{ name: Brand.name, schema: BrandSchema }]),
    AdminAuthModule,
  ],
  controllers: [BrandAdminController, BrandClientController],
  providers: [BrandService],
  exports: [BrandService],
})
export class BrandModule {}
