import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ProductFavorite, ProductFavoriteSchema } from '@/database/schemas/product-favorite.schema';
import { Product, ProductSchema } from '@/database/schemas/product.schema';
import { ProductFavoriteController } from './controllers/product-favorite.controller';
import { ProductFavoriteService } from './services/product-favorite.service';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: ProductFavorite.name, schema: ProductFavoriteSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [ProductFavoriteController],
  providers: [ProductFavoriteService],
  exports: [ProductFavoriteService],
})
export class ProductFavoriteModule {}
