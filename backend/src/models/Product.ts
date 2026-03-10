import mongoose, { Schema, Document } from 'mongoose';

export interface IProductVariant {
  weight: number;
  unit: string;
  price: number;
}

export interface IProduct extends Document {
  productId: string;        // UUID kept for legacy and quick ref
  name: string;
  slug: string;
  categoryId: string;       // Will store Category UUID (matching String)

  description: string;
  brand: string;

  images: string[];

  pricing: {
    basePrice: number;
    unit: string;
    mrp: number;
  };

  variants: IProductVariant[];

  inventory: {
    quantity: number;
    unit: string;
    lowStockThreshold: number;
  };

  minOrder: number;
  minHomeDeliveryQuantity: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  specifications: any;      // Schema.Types.Mixed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  specificationsHi: any;    // Schema.Types.Mixed

  tags: string[];

  isActive: boolean;
  isFeatured: boolean;
  priority: number;
  views: number;
  totalSold: number;

  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    productId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    categoryId: { type: String, required: true },

    description: { type: String, default: '' },
    brand: { type: String, default: '' },
    images: { type: [String], default: [] },

    pricing: {
      basePrice: { type: Number, required: true },
      unit: { type: String, required: true },
      mrp: { type: Number, default: 0 },
    },

    variants: [
      {
        weight: { type: Number, required: true },
        unit: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],

    inventory: {
      quantity: { type: Number, default: 0 },
      unit: { type: String, default: 'kg' },
      lowStockThreshold: { type: Number, default: 10 },
    },

    minOrder: { type: Number, default: 1 },
    minHomeDeliveryQuantity: { type: Number, default: 0 },
    stockStatus: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock',
    },

    specifications: { type: Schema.Types.Mixed, default: {} },
    specificationsHi: { type: Schema.Types.Mixed, default: {} },

    tags: { type: [String], default: [] },

    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ isActive: 1 });

export default mongoose.model<IProduct>('Product', ProductSchema);
