import mongoose, { Schema, Document } from "mongoose";

export interface IBanner extends Document {
  bannerId: string;
  title: string;
  titleHi: string;
  subtitle: string;
  subtitleHi: string;
  imageUrl: string;
  ctaText: string;
  ctaTextHi: string;
  ctaLink: string;
  bgColor: string;
  isActive: boolean;
  priority: number;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema<IBanner>(
  {
    bannerId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleHi: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    subtitleHi: { type: String, default: "" },
    imageUrl: { type: String, required: true },
    ctaText: { type: String, default: "Shop Now" },
    ctaTextHi: { type: String, default: "अभी खरीदें" },
    ctaLink: { type: String, default: "/products" },
    bgColor: { type: String, default: "#F0FAF5" },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { timestamps: true },
);

BannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
BannerSchema.index({ priority: -1 });

export default mongoose.model<IBanner>("Banner", BannerSchema);
