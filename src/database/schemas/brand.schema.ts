import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, Types } from 'mongoose';
import slugify from 'slugify';

export type BrandDocument = Brand & Document;

@Schema({ timestamps: true })
export class Brand {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, unique: true, lowercase: true })
  slug: string;

  @Prop({ type: String, default: null })
  description: string;

  @Prop({ type: String, default: null })
  logo: string;

  @Prop({ type: String, default: null })
  website: string;

  @Prop({ type: String, default: null })
  country: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isFeatured: boolean;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);

// Add indexes for better query performance
BrandSchema.index({ slug: 1 }, { unique: true });
BrandSchema.index({ name: 1 });
BrandSchema.index({ isActive: 1 });
BrandSchema.index({ isFeatured: 1 });

// Pre-save middleware to generate slug
BrandSchema.pre('save', async function (next) {
  if (this.isModified('name')) {
    this.slug = await generateUniqueSlug(this.constructor as Model<BrandDocument>, this.name, this._id.toString());
  }
  next();
});

// Pre-update middleware to generate slug
BrandSchema.pre(['updateOne', 'findOneAndUpdate'], async function (next) {
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
async function generateUniqueSlug(model: Model<BrandDocument>, name: string, excludeId?: string): Promise<string> {
  const baseSlug = slugify(name, {
    lower: true, // Convert to lowercase
    strict: true, // Remove special characters
    trim: true, // Trim leading and trailing spaces
    locale: 'vi', // Support Vietnamese characters
  });

  // Check if base slug is available
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
