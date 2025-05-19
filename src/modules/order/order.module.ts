import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '@/database/schemas/order.schema';
import { Product, ProductSchema } from '@/database/schemas/product.schema';
import { Voucher, VoucherSchema } from '@/database/schemas/voucher.schema';
import { ProductReview, ProductReviewSchema } from '@/database/schemas/product-review.schema';
import { OrderService } from './services/order.service';
import { OrderAdminService } from './services/order-admin.service';
import { PaymentService } from './services/payment.service';
import { OrderClientController } from './controllers/client/order-client.controller';
import { OrderAdminController } from './controllers/admin/order-admin.controller';
import { VoucherModule } from '../voucher/voucher.module';
import { ProductModule } from '../product/product.module';
import { PaymentHistory, PaymentHistorySchema } from '@/database/schemas/payment-history.schema';
import { JwtModule } from '@nestjs/jwt';
import { User, UserSchema } from '@/database/schemas/user.schema';
import { Admin, AdminSchema } from '@/database/schemas/admin.schema';
import { EmailModule } from '../email/email.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { UserModule } from '../user/user.module';
import { PaymentController } from './controllers/payment.controller';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Voucher.name, schema: VoucherSchema },
      { name: PaymentHistory.name, schema: PaymentHistorySchema },
      { name: ProductReview.name, schema: ProductReviewSchema },
      { name: User.name, schema: UserSchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
    VoucherModule,
    ProductModule,
    JwtModule,
    EmailModule,
    AdminAuthModule,
    UserModule,
    VoucherModule,
  ],
  controllers: [PaymentController, OrderClientController, OrderAdminController],
  providers: [OrderService, OrderAdminService, PaymentService],
  exports: [OrderService, OrderAdminService, PaymentService],
})
export class OrderModule {}
