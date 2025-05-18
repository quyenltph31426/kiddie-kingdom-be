import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AdminRoles } from '@/shared/enums';

export type AdminDocument = Admin & Document;

@Schema({ timestamps: true })
export class Admin {
  @Prop({ required: true })
  username: string;

  @Prop({ type: String, default: null })
  avatar: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: String,
    enum: AdminRoles,
    default: AdminRoles.ADMIN,
  })
  role: AdminRoles;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  lastLogin: Date;
}
export const AdminSchema = SchemaFactory.createForClass(Admin);
