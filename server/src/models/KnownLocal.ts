import mongoose, { Schema } from 'mongoose';

export interface IKnownLocal {
  name: string;
  logoUrl?: string;
  favorite?: boolean;
}

const KnownLocalSchema = new Schema<IKnownLocal>({
  name: { type: String, required: true, unique: true, index: true },
  logoUrl: { type: String },
  favorite: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<IKnownLocal>('KnownLocal', KnownLocalSchema);
