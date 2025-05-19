import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ProductRecommendationService } from './services/product-recommendation.service';
import { ProductRecommendationController } from './controllers/product-recommendation.controller';
import { Product, ProductSchema } from '@/database/schemas/product.schema';

@Module({
  imports: [ConfigModule, MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }])],
  controllers: [ProductRecommendationController],
  providers: [ProductRecommendationService],
  exports: [ProductRecommendationService],
})
export class RecommendationModule {}
