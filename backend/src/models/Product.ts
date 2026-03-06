import mongoose, { Schema, Document } from 'mongoose';

export interface IProductVariant {
  variantId: string;
  size: string;       // e.g. "1kg", "5kg", "10kg"
  price: number;
  discount: number;
  finalPrice: number;
  stock: number;
}

export interface IProduct extends Document {
  productId: string;
  name: string;
  nameHi: string;
  description: string;
  descriptionHi: string;
  price: number;          // base price (smallest variant)
  discount: number;       // percent
  finalPrice: number;
  imageUrl: string;
  stock: number;          // total stock (sum of variants or simple)
  categoryId: string;
  unitType: 'kg' | 'g' | 'litre' | 'packet' | 'piece';
  variants: IProductVariant[];
  isFeatured: boolean;
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const VariantSchema = new Schema<IProductVariant>(
  {
    variantId: { type: String, required: true },
    size: { type: String, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },
    stock: { type: Number, default: 0 },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    productId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameHi: { type: String, default: '' },
    description: { type: String, default: '' },
    descriptionHi: { type: String, default: '' },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },
    imageUrl: { type: String, default: '' },
    stock: { type: Number, default: 0 },
    categoryId: { type: String, required: true },
    unitType: {
      type: String,
      enum: ['kg', 'g', 'litre', 'packet', 'piece'],
      default: 'kg',
    },
    variants: { type: [VariantSchema], default: [] },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Text search index
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

export default mongoose.model<IProduct>('Product', ProductSchema);
