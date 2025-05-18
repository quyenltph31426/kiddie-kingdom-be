import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Voucher, VoucherSchema } from '@/database/schemas/voucher.schema';
import { VoucherService } from './services/voucher.service';
import { VoucherAdminController } from './controllers/admin/voucher-admin.controller';
import { VoucherClientController } from './controllers/client/voucher-client.controller';
import { Admin, AdminSchema } from '@/database/schemas/admin.schema';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Voucher.name, schema: VoucherSchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
    JwtModule.register({}),
  ],
  controllers: [VoucherAdminController, VoucherClientController],
  providers: [VoucherService],
  exports: [VoucherService],
})
export class VoucherModule {}
