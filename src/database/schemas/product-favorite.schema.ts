import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductFavoriteDocument = ProductFavorite & Document;

@Schema({ timestamps: true, collection: 'product_favorite' })
export class ProductFavorite {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;
}

export const ProductFavoriteSchema = SchemaFactory.createForClass(ProductFavorite);

// Add compound index to ensure a user can only favorite a product once
ProductFavoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });
