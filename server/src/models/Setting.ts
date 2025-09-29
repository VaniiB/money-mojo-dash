import mongoose, { Schema } from 'mongoose';

export interface ISetting {
  key: string;
  data: unknown;
}

const SettingSchema = new Schema<ISetting>({
  key: { type: String, required: true, unique: true, index: true },
  data: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });

export default mongoose.model<ISetting>('Setting', SettingSchema);
