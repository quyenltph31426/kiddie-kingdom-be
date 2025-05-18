import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, Schema as MongooseSchema, Types } from 'mongoose';

import slugify from 'slugify';
export type ProductDocument = Product & Document;

// Define variant schema separately to avoid circular references
@Schema({ _id: true })
export class ProductVariant {
  @Prop({ required: true })
  sku: string;

  @Prop({ required: true, type: Number })
  price: number;

  @Prop({ type: Number })
  salePrice?: number;

  @Prop({ required: true, type: Number, default: 0 })
  quantity: number;

  @Prop({ required: true, type: Number, default: 0 })
  soldCount: number;

  @Prop({ type: Object })
  attributes?: Record<string, string>;

  _id?: string;
}

const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

@Schema({
  timestamps: true,
})
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, unique: true, lowercase: true })
  slug: string;

  @Prop()
  description?: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Category' }] })
  categories?: Types.ObjectId[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category' })
  primaryCategoryId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Brand' })
  brandId?: Types.ObjectId;

  @Prop()
  brandName?: string;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ type: [String], default: [] })
  images?: string[];

  @Prop({ type: [ProductVariantSchema], default: [] })
  variants?: ProductVariant[];

  @Prop({ default: true })
  isActive?: boolean;

  @Prop({ default: false })
  isFeatured?: boolean;

  @Prop({ default: false })
  isNewArrival?: boolean;

  @Prop({ default: false })
  isBestSeller?: boolean;

  @Prop({ default: false })
  isOnSale?: boolean;

  @Prop({ type: Number, default: 0 })
  viewCount?: number;

  @Prop({ required: true, type: Number })
  originalPrice: number;

  @Prop({ type: Object })
  specifications?: Record<string, string>;

  @Prop({ type: Number, default: 0 })
  averageRating: number;

  @Prop({ type: Number, default: 0 })
  reviewCount: number;

  // Don't use getter/setter for virtual properties
  // This can cause infinite recursion

  totalSoldCount?: number;
  isFavorite?: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Add virtual for isFavorite without using getter/setter
// ProductSchema.virtual('isFavorite');

// Fix the pre-save hook to avoid potential infinite recursion
ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ name: 1 });
ProductSchema.index({ categories: 1 });
ProductSchema.index({ primaryCategoryId: 1 });
ProductSchema.index({ brandId: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ isFeatured: 1 });
ProductSchema.index({ isOnSale: 1 });
ProductSchema.index({ isNewArrival: 1 });
ProductSchema.index({ isBestSeller: 1 });
ProductSchema.index({ totalSoldCount: -1 });
ProductSchema.index({ viewCount: -1 });
ProductSchema.index({ averageRating: -1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ 'variants.price': 1 });
ProductSchema.index({ 'variants.sku': 1 });
ProductSchema.index({ 'variants.soldCount': -1 });

// Pre-save middleware to generate slug and validate prices
ProductSchema.pre('save', async function (next) {
  // Generate slug if name is modified
  if (this.isModified('name')) {
    this.slug = await generateUniqueSlug(this.constructor as Model<ProductDocument>, this.name, this._id.toString());
  }

  // Validate prices in variants
  if (this.variants && Array.isArray(this.variants)) {
    for (const variant of this.variants) {
      // Ensure price is a valid number
      if (variant.price === undefined || variant.price === null || isNaN(Number(variant.price))) {
        return next(new Error(`Invalid price value in variant: ${variant.sku || ''}`));
      }

      // Convert price to number if it's a string
      if (typeof variant.price === 'string') {
        variant.price = Number(variant.price);
      }

      // Ensure salePrice is a valid number if provided
      if (variant.salePrice !== undefined && variant.salePrice !== null) {
        if (isNaN(Number(variant.salePrice))) {
          return next(new Error(`Invalid sale price value in variant: ${variant.sku || ''}`));
        }

        // Convert salePrice to number if it's a string
        if (typeof variant.salePrice === 'string') {
          variant.salePrice = Number(variant.salePrice);
        }
      }

      // Ensure quantity is a valid number
      if (variant.quantity === undefined || variant.quantity === null || isNaN(Number(variant.quantity))) {
        return next(new Error(`Invalid quantity value in variant: ${variant.sku || ''}`));
      }

      // Convert quantity to number if it's a string
      if (typeof variant.quantity === 'string') {
        variant.quantity = Number(variant.quantity);
      }
    }
  }

  next();
});

// Pre-update middleware to generate slug
ProductSchema.pre(['updateOne', 'findOneAndUpdate'], async function (next) {
  const update = this.getUpdate() as any;
  if (update.name || update.$set?.name) {
    const name = update.name || update.$set.name;
    const docId = (this.getQuery()._id as Types.ObjectId).toString();
    if (!update.$set) update.$set = {};
    update.$set.slug = await generateUniqueSlug(this.model, name, docId);
  }
  next();
});

// Helper function to generate unique slug
async function generateUniqueSlug(model: Model<ProductDocument>, name: string, excludeId?: string): Promise<string> {
  const baseSlug = slugify(name, {
    lower: true,
    strict: true,
    trim: true,
    locale: 'vi',
  });

  const query = excludeId ? { slug: baseSlug, _id: { $ne: new Types.ObjectId(excludeId) } } : { slug: baseSlug };

  const existingWithSlug = await model.findOne(query);

  if (!existingWithSlug) {
    return baseSlug;
  }

  // If slug exists, add a counter until we find an available slug
  let counter = 1;
  let newSlug = `${baseSlug}-${counter}`;

  while (
    await model.findOne(excludeId ? { slug: newSlug, _id: { $ne: new Types.ObjectId(excludeId) } } : { slug: newSlug })
  ) {
    counter += 1;
    newSlug = `${baseSlug}-${counter}`;
  }

  return newSlug;
}
