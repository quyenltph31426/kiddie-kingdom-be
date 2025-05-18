import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Order, OrderSchema } from '@/database/schemas/order.schema';
import { PaymentHistory, PaymentHistorySchema } from '@/database/schemas/payment-history.schema';
import { Product, ProductSchema } from '@/database/schemas/product.schema';
import { Admin, AdminSchema } from '@/database/schemas/admin.schema';
import { User, UserSchema } from '@/database/schemas/user.schema';
import { OrderService } from './services/order.service';
import { OrderAdminService } from './services/order-admin.service';
import { PaymentService } from './services/payment.service';
import { OrderClientController } from './controllers/client/order-client.controller';
import { OrderAdminController } from './controllers/admin/order-admin.controller';
import { ProductModule } from '../product/product.module';
import { EmailModule } from '../email/email.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { UserModule } from '../user/user.module';
import { VoucherModule } from '../voucher/voucher.module';
import { PaymentController } from './controllers/payment.controller';
import { Voucher, VoucherSchema } from '@/database/schemas/voucher.schema';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: PaymentHistory.name, schema: PaymentHistorySchema },
      { name: Product.name, schema: ProductSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: User.name, schema: UserSchema },
      { name: Voucher.name, schema: VoucherSchema },
    ]),
    ProductModule,
    EmailModule,
    AdminAuthModule,
    UserModule,
    VoucherModule,
  ],
  controllers: [OrderClientController, OrderAdminController, PaymentController],
  providers: [OrderService, OrderAdminService, PaymentService],
  exports: [OrderService, OrderAdminService, PaymentService],
})
export class OrderModule {}
