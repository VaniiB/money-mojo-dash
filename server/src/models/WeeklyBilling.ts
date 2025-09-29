import mongoose, { Schema } from 'mongoose';

export interface IWeeklyBilling {
  weekKey: string; // YYYY-MM-DD (lunes)
  vanina?: number;
  leonardo?: number;
  registeredSum?: number;
  registeredAt?: string;
}

const WeeklyBillingSchema = new Schema<IWeeklyBilling>({
  weekKey: { type: String, required: true, unique: true, index: true },
  vanina: { type: Number },
  leonardo: { type: Number },
  registeredSum: { type: Number },
  registeredAt: { type: String },
}, { timestamps: true });

export default mongoose.model<IWeeklyBilling>('WeeklyBilling', WeeklyBillingSchema);
