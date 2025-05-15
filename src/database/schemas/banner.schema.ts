import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BannerDocument = Banner & Document;

export enum BannerType {
  HOME_HERO = 'HOME_HERO',
  HOME_SECONDARY = 'HOME_SECONDARY',
  CATEGORY = 'CATEGORY',
  PROMOTION = 'PROMOTION',
}

@Schema({ timestamps: true })
export class Banner {
  @Prop({ required: true })
  title: string;

  @Prop({ type: String, default: null })
  subtitle: string;

  @Prop({ required: true })
  image: string;

  @Prop({ type: String, default: null })
  link: string;

  @Prop({
    type: String,
    enum: Object.values(BannerType),
    default: BannerType.HOME_HERO,
  })
  type: BannerType;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);

// Add indexes for better query performance
BannerSchema.index({ type: 1, position: 1, order: 1 });
BannerSchema.index({ isActive: 1 });
BannerSchema.index({ startDate: 1, endDate: 1 });
