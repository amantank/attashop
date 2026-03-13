import mongoose, { Schema, Document } from 'mongoose';

export type OfferType = 'flash_sale' | 'banner' | 'category_sale';
export type DiscountType = 'percentage' | 'flat';
export type OfferTheme = 'fire' | 'summer' | 'festival' | 'fresh' | 'royal';

export interface IOffer extends Document {
  offerId: string;
  title: string;
  titleHi: string;
  description: string;
  descriptionHi: string;
  type: OfferType;
  discountType: DiscountType;
  discountValue: number;
  theme: OfferTheme;
  bannerImage?: string;
  applicableProducts: string[];   // productIds — empty = all products
  applicableCategories: string[]; // categoryIds — empty = all categories
  minOrderAmount: number;
  maxDiscount: number;            // 0 = no cap
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  priority: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>(
  {
    offerId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleHi: { type: String, default: '' },
    description: { type: String, default: '' },
    descriptionHi: { type: String, default: '' },
    type: {
      type: String,
      enum: ['flash_sale', 'banner', 'category_sale'],
      required: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      default: 'percentage',
    },
    discountValue: { type: Number, required: true },
    theme: {
      type: String,
      enum: ['fire', 'summer', 'festival', 'fresh', 'royal'],
      default: 'fire',
    },
    bannerImage: { type: String },
    applicableProducts: [{ type: String }],
    applicableCategories: [{ type: String }],
    minOrderAmount: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

OfferSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
OfferSchema.index({ type: 1 });

export default mongoose.model<IOffer>('Offer', OfferSchema);