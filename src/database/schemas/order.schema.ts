import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderStatus, PAYMENT_METHOD } from '@/shared/enums';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
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

  @Prop({ type: String })
  productName: string;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  orderNumber: string;

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
    enum: Object.values(OrderStatus),
    default: OrderStatus.TO_PAY,
  })
  status: string;

  @Prop({
    type: String,
    enum: Object.values(PAYMENT_METHOD),
    required: true,
  })
  paymentMethod: string;

  @Prop({ type: Date })
  paidAt: Date;

  @Prop({ type: Object })
  shippingAddress: {
    fullName: string;
    address: string;
    city: string;
    postalCode: string;
    phone: string;
  };

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
    this.orderNumber = `ORD-${timestamp}${random}`;
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
