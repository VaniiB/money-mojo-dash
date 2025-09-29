import mongoose, { Schema } from 'mongoose';

export interface IAccessory {
  id: string; // client-provided id for compatibility
  url: string;
  title: string;
  price?: number;
  image?: string;
  description?: string;
  bought?: boolean;
}

const AccessorySchema = new Schema<IAccessory>({
  id: { type: String, required: true, unique: true, index: true },
  url: { type: String, required: true },
  title: { type: String, required: true },
  price: { type: Number },
  image: { type: String },
  description: { type: String },
  bought: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<IAccessory>('Accessory', AccessorySchema);
