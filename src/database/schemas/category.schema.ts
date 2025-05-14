import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, Types } from 'mongoose';
import slugify from 'slugify';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, unique: true, lowercase: true })
  slug: string;

  @Prop({ type: String, default: null })
  description: string;

  @Prop({ type: String, default: null })
  image: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Add indexes for better query performance
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ name: 1 });
CategorySchema.index({ isActive: 1 });

// Pre-save middleware to generate slug
CategorySchema.pre('save', async function (next) {
  if (this.isModified('name')) {
    this.slug = await generateUniqueSlug(this.constructor as Model<CategoryDocument>, this.name, this._id.toString());
  }
  next();
});

// Pre-update middleware to generate slug
CategorySchema.pre(['updateOne', 'findOneAndUpdate'], async function (next) {
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
async function generateUniqueSlug(model: Model<CategoryDocument>, name: string, excludeId?: string): Promise<string> {
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

  // If base slug is taken, find the next available number
  let counter = 1;
  let uniqueSlug = '';
  let exists = true;

  while (exists) {
    uniqueSlug = `${baseSlug}-${counter}`;
    const query = excludeId ? { slug: uniqueSlug, _id: { $ne: new Types.ObjectId(excludeId) } } : { slug: uniqueSlug };

    const existingWithCounter = await model.findOne(query);
    if (!existingWithCounter) {
      exists = false;
    } else {
      counter++;
    }
  }

  return uniqueSlug;
}
