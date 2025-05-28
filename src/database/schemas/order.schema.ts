import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentStatus, ShippingStatus, PAYMENT_METHOD } from '@/shared/enums';

export type OrderDocument = Order & Document;

@Schema()
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  variantId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ type: Object })
  attributes?: Record<string, string>;

  @Prop({ required: true })
  price: number;

  _id?: string;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  orderCode: string;

  @Prop({ type: [OrderItemSchema], default: [] })
  items: OrderItem[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ type: Number, default: 0 })
  discountAmount: number;

  @Prop({ type: Types.ObjectId, ref: 'Voucher', default: null })
  voucherId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
  })
  paymentStatus: string;

  @Prop({
    type: String,
    enum: Object.values(ShippingStatus),
    default: ShippingStatus.PENDING,
  })
  shippingStatus: string;

  @Prop({
    type: String,
    enum: Object.values(PAYMENT_METHOD),
    required: true,
  })
  paymentMethod: string;

  @Prop({ type: Date })
  paidAt: Date;

  @Prop({ type: String })
  trackingNumber: string;

  @Prop({ type: Date })
  shippedAt: Date;

  @Prop({ type: Date })
  deliveredAt: Date;

  @Prop({ type: Object, required: true })
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    district: string;
    ward?: string;
    postalCode?: string;
  };

  @Prop({ type: Date, default: null, required: false })
  cancelledAt: Date;

  @Prop({ type: String, default: null, required: false })
  cancelledReason: string;

  @Prop({ type: String, default: null, required: false })
  userNote: string;

  @Prop({ type: [String], default: [] })
  shipperOfProof: string[];

  // Explicitly define timestamps
  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Generate unique order number
OrderSchema.pre('save', function (next) {
  if (this.isNew) {
    const timestamp = new Date().getTime().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    this.orderCode = `ORDER-${timestamp}-${random}`;
  }
  next();
});

// Calculate final amount with discount
OrderSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    const subtotal = this.items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);

    this.totalAmount = Math.max(0, subtotal - this.discountAmount);
  } else {
    this.totalAmount = 0;
  }
  next();
});
