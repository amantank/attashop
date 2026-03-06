import mongoose, { Schema, Document } from 'mongoose';

export interface IDeliverySlot extends Document {
  slotId: string;
  label: string;
  startTime: string;    // e.g. "09:00"
  endTime: string;      // e.g. "12:00"
  maxOrders: number;
  isActive: boolean;
}

const DeliverySlotSchema = new Schema<IDeliverySlot>(
  {
    slotId: { type: String, required: true, unique: true },
    label: { type: String, required: true },    // "9AM – 12PM"
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    maxOrders: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDeliverySlot>('DeliverySlot', DeliverySlotSchema);
