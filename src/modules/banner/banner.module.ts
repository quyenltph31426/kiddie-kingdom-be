import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Banner, BannerSchema } from '@/database/schemas/banner.schema';
import { BannerAdminController } from './controllers/admin/banner-admin.controller';
import { BannerClientController } from './controllers/client/banner-client.controller';
import { BannerService } from './services/banner.service';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { Admin, AdminSchema } from '@/database/schemas/admin.schema';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: Banner.name, schema: BannerSchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
    AdminAuthModule,
  ],
  controllers: [BannerAdminController, BannerClientController],
  providers: [BannerService],
  exports: [BannerService],
})
export class BannerModule {}
