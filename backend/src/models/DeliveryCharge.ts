import mongoose, { Schema, Document } from 'mongoose';

export interface IDeliveryChargeRule {
  pincode?: string;
  minDistance?: number;
  maxDistance?: number;
  charge: number;
  isFree: boolean;
}

export interface IDeliveryCharge extends Document {
  type: 'pincode' | 'flat';
  flatCharge: number;
  freeAboveAmount: number;
  rules: IDeliveryChargeRule[];
}

const RuleSchema = new Schema<IDeliveryChargeRule>(
  {
    pincode: { type: String },
    minDistance: { type: Number },
    maxDistance: { type: Number },
    charge: { type: Number, default: 0 },
    isFree: { type: Boolean, default: false },
  },
  { _id: false }
);

const DeliveryChargeSchema = new Schema<IDeliveryCharge>(
  {
    type: { type: String, enum: ['pincode', 'flat'], default: 'flat' },
    flatCharge: { type: Number, default: 30 },
    freeAboveAmount: { type: Number, default: 500 },
    rules: { type: [RuleSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<IDeliveryCharge>('DeliveryCharge', DeliveryChargeSchema);
