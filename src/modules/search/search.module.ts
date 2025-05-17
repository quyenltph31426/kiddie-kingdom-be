import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '@/database/schemas/product.schema';
import { Category, CategorySchema } from '@/database/schemas/category.schema';
import { Brand, BrandSchema } from '@/database/schemas/brand.schema';
import { ProductFavorite, ProductFavoriteSchema } from '@/database/schemas/product-favorite.schema';
import { SearchService } from './services/search.service';
import { SearchController } from './controllers/search.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Brand.name, schema: BrandSchema },
      { name: ProductFavorite.name, schema: ProductFavoriteSchema },
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
