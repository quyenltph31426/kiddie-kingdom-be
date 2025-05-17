import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserAddressDocument = UserAddress & Document;

@Schema()
export class AddressDetails {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  addressLine1: string;

  @Prop({ type: String, required: false, default: null })
  addressLine2?: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  district: string;

  @Prop({ type: String, required: false, default: null })
  ward?: string;

  @Prop({ type: String, required: false, default: null })
  postalCode?: string;

  @Prop({ default: false })
  isDefault: boolean;

  _id?: string;
}

const AddressDetailsSchema = SchemaFactory.createForClass(AddressDetails);

@Schema({ timestamps: true, collection: 'user_address' })
export class UserAddress {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: [AddressDetailsSchema], default: [] })
  addresses: AddressDetails[];
}

export const UserAddressSchema = SchemaFactory.createForClass(UserAddress);

// Add compound index for better query performance
UserAddressSchema.index({ userId: 1 });
