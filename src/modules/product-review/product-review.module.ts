import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductReview, ProductReviewSchema } from '@/database/schemas/product-review.schema';
import { Product, ProductSchema } from '@/database/schemas/product.schema';
import { Order, OrderSchema } from '@/database/schemas/order.schema';
import { ProductReviewService } from './services/product-review.service';
import { ProductReviewClientController } from './controllers/client/product-review-client.controller';
import { ProductReviewAdminController } from './controllers/admin/product-review-admin.controller';
import { JwtModule } from '@nestjs/jwt';
import { Admin, AdminSchema } from '@/database/schemas/admin.schema';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: ProductReview.name, schema: ProductReviewSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
  ],
  controllers: [ProductReviewClientController, ProductReviewAdminController],
  providers: [ProductReviewService],
  exports: [ProductReviewService],
})
export class ProductReviewModule {}
