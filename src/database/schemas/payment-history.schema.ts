import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentProvider {
  VNPAY = 'VNPAY',
  MANUAL = 'MANUAL',
}

export type PaymentHistoryDocument = PaymentHistory & Document;

@Schema({ timestamps: true, collection: 'payment_history' })
export class PaymentHistory {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'vnd' })
  currency: string;

  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
  })
  status: string;

  @Prop({
    type: String,
    enum: Object.values(PaymentProvider),
    required: true,
  })
  provider: string;

  @Prop({ type: String })
  transactionId: string;

  @Prop({ type: Object })
  paymentDetails: Record<string, any>;

  @Prop({ type: Object })
  transactionData: Record<string, any>;

  @Prop({ type: String })
  failureReason: string;

  @Prop({ type: Date })
  completedAt: Date;
}

export const PaymentHistorySchema = SchemaFactory.createForClass(PaymentHistory);
