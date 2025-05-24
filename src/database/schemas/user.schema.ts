import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  username: string;

  @Prop({ type: String, default: null })
  avatar: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: false, default: null })
  password: string;

  @Prop({
    type: [
      {
        provider: { type: String, required: true },
        providerId: { type: String, required: true },
      },
    ],
    default: [],
  })
  providers: {
    provider: string;
    providerId: string;
  }[];

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ type: String, default: null })
  verificationToken: string;

  @Prop({ type: Date, default: null })
  verificationTokenExpires: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  lastLogin: Date;

  @Prop({ type: String, default: null })
  resetPasswordToken: string;

  @Prop({ type: Date, default: null })
  resetPasswordTokenExpires: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
