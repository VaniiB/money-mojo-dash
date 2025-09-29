import mongoose, { Schema } from 'mongoose';

export interface IReservation {
  id: string;
  local: string;
  amount: number;
  person: 'vanina' | 'leonardo';
  shift: 'dia' | 'noche';
  status: 'reservado' | 'facturado' | 'cobrado';
}

export interface IDayData {
  date: string; // YYYY-MM-DD
  reservations: IReservation[];
  envios_day_packages: number;
  envios_night_packages: number;
  tip_day?: number;
  tip_night?: number;
}

const ReservationSchema = new Schema<IReservation>({
  id: { type: String, required: true },
  local: { type: String, required: true },
  amount: { type: Number, required: true },
  person: { type: String, enum: ['vanina','leonardo'], required: true },
  shift: { type: String, enum: ['dia','noche'], required: true },
  status: { type: String, enum: ['reservado','facturado','cobrado'], required: true },
}, { _id: false });

const DayDataSchema = new Schema<IDayData>({
  date: { type: String, required: true, index: true },
  reservations: { type: [ReservationSchema], default: [] },
  envios_day_packages: { type: Number, default: 0 },
  envios_night_packages: { type: Number, default: 0 },
  tip_day: { type: Number },
  tip_night: { type: Number },
});

export default mongoose.model<IDayData>('WeekData', DayDataSchema);
