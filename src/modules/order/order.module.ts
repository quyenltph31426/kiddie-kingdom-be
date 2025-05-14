import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '@/database/schemas/order.schema';
import { PaymentHistory, PaymentHistorySchema } from '@/database/schemas/payment-history.schema';
import { OrderClientController } from './controllers/client/order-client.controller';
import { OrderAdminController } from './controllers/admin/order-admin.controller';
import { PaymentController } from './controllers/payment.controller';
import { OrderService } from './services/order.service';
import { OrderAdminService } from './services/order-admin.service';
import { PaymentService } from './services/payment.service';
import { ProductModule } from '../product/product.module';
import { EmailModule } from '../email/email.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: PaymentHistory.name, schema: PaymentHistorySchema },
    ]),
    ProductModule,
    EmailModule,
    AdminAuthModule,
  ],
  controllers: [OrderClientController, OrderAdminController, PaymentController],
  providers: [OrderService, OrderAdminService, PaymentService],
  exports: [OrderService, OrderAdminService, PaymentService],
})
export class OrderModule {}
