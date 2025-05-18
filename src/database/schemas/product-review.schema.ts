import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductReviewDocument = ProductReview & Document;

@Schema({ timestamps: true, collection: 'product_reviews' })
export class ProductReview {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true })
  comment: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isVerified: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Admin' })
  verifiedBy: Types.ObjectId;

  @Prop({ type: Date })
  verifiedAt: Date;

  @Prop({ type: Boolean, default: true })
  isPurchased: boolean;
}

export const ProductReviewSchema = SchemaFactory.createForClass(ProductReview);

// Add compound index to ensure a user can only review a product once
ProductReviewSchema.index({ userId: 1, productId: 1, orderId: 1 }, { unique: true });

// Add indexes for better query performance
ProductReviewSchema.index({ productId: 1, isActive: 1 });
ProductReviewSchema.index({ userId: 1 });
ProductReviewSchema.index({ orderId: 1 });
ProductReviewSchema.index({ createdAt: -1 });
ProductReviewSchema.index({ rating: -1 });
