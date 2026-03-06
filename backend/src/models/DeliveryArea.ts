import mongoose, { Schema, Document } from 'mongoose';

export interface IDeliveryArea extends Document {
  pincode: string;
  name: string;
  isActive: boolean;
}

const DeliveryAreaSchema = new Schema<IDeliveryArea>(
  {
    pincode: { type: String, required: true, unique: true },
    name: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDeliveryArea>('DeliveryArea', DeliveryAreaSchema);
