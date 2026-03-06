import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderProduct {
  productId: string;
  productName: string;
  variantId?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type PaymentMethod = 'upi' | 'gpay' | 'paytm' | 'cod' | 'razorpay';
export type PaymentStatus = 'pending' | 'paid' | 'cod' | 'failed';
export type OrderStatus = 'placed' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface IOrder extends Document {
  orderId: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  pincode: string;
  landmark?: string;
  products: IOrderProduct[];
  totalPrice: number;
  deliveryCharge: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryDate: string;
  deliverySlot: string;
  invoicePath?: string;
  isSubscriptionOrder: boolean;
  subscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderProductSchema = new Schema<IOrderProduct>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    variantId: { type: String },
    size: { type: String },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    phoneNumber: { type: String, required: true, index: true },
    address: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: { type: String },
    products: { type: [OrderProductSchema], required: true },
    totalPrice: { type: Number, required: true },
    deliveryCharge: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['upi', 'gpay', 'paytm', 'cod', 'razorpay'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'cod', 'failed'],
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: ['placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'placed',
    },
    deliveryDate: { type: String, required: true },
    deliverySlot: { type: String, required: true },
    invoicePath: { type: String },
    isSubscriptionOrder: { type: Boolean, default: false },
    subscriptionId: { type: String },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ phoneNumber: 1, createdAt: -1 });

export default mongoose.model<IOrder>('Order', OrderSchema);
