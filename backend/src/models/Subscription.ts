import mongoose, { Schema, Document } from 'mongoose';

export type SubscriptionFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export interface ISubscription extends Document {
  subscriptionId: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  pincode: string;
  productId: string;
  productName: string;
  variantId?: string;
  size?: string;
  quantity: number;
  frequency: SubscriptionFrequency;
  customDays?: number; // Only populated if frequency === 'custom'
  nextDeliveryDate: Date;
  paymentMethod: string;
  subscriptionStatus: SubscriptionStatus;
  createdAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    subscriptionId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    phoneNumber: { type: String, required: true, index: true },
    address: { type: String, required: true },
    pincode: { type: String, required: true },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    variantId: { type: String },
    size: { type: String },
    quantity: { type: Number, required: true },
    frequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'custom'],
      required: true,
    },
    customDays: { type: Number, min: 1, max: 90 }, // 1 to 90 days allowed for custom frequency
    nextDeliveryDate: { type: Date, required: true },
    paymentMethod: { type: String, required: true },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'paused', 'cancelled'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
