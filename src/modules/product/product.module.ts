import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '@/database/schemas/product.schema';
import { Category, CategorySchema } from '@/database/schemas/category.schema';
import { Brand, BrandSchema } from '@/database/schemas/brand.schema';
import { ProductFavorite, ProductFavoriteSchema } from '@/database/schemas/product-favorite.schema';
import { ProductAdminController } from './controllers/admin/product-admin.controller';
import { ProductClientController } from './controllers/client/product-client.controller';
import { ProductAdminService } from './services/product-admin.service';
import { ProductClientService } from './services/product-client.service';
import { ProductService } from './services/product.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Brand.name, schema: BrandSchema },
      { name: ProductFavorite.name, schema: ProductFavoriteSchema },
    ]),
  ],
  controllers: [ProductAdminController, ProductClientController],
  providers: [ProductAdminService, ProductClientService, ProductService],
  exports: [ProductAdminService, ProductClientService, ProductService],
})
export class ProductModule {}
