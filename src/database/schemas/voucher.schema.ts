import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VoucherDocument = Voucher & Document;

export enum VoucherType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum VoucherStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
}

@Schema({ timestamps: true })
export class Voucher {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, default: null })
  description: string;

  @Prop({
    type: String,
    enum: Object.values(VoucherType),
    default: VoucherType.PERCENTAGE,
  })
  type: VoucherType;

  @Prop({ required: true, min: 0 })
  value: number;

  @Prop({ min: 0, default: 0 })
  minOrderValue: number;

  @Prop({ min: 0, default: null })
  maxDiscountValue: number;

  @Prop({ required: true, default: 0 })
  usageLimit: number;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({
    type: String,
    enum: Object.values(VoucherStatus),
    default: VoucherStatus.ACTIVE,
  })
  status: VoucherStatus;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);

// Add indexes for better query performance
VoucherSchema.index({ code: 1 }, { unique: true });
VoucherSchema.index({ status: 1 });
VoucherSchema.index({ startDate: 1, endDate: 1 });
VoucherSchema.index({ isActive: 1 });

// Pre-save hook to update status based on dates
VoucherSchema.pre('save', function (next) {
  const now = new Date();

  if (this.endDate < now) {
    this.status = VoucherStatus.EXPIRED;
  } else if (this.startDate > now) {
    this.status = VoucherStatus.INACTIVE;
  } else if (this.isActive) {
    this.status = VoucherStatus.ACTIVE;
  } else {
    this.status = VoucherStatus.INACTIVE;
  }

  next();
});
