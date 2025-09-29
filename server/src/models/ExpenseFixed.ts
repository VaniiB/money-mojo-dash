import mongoose, { Schema } from 'mongoose';

export interface IExpenseFixed {
  id: string;
  provider: string;
  type: 'Luz' | 'Gas' | 'Internet' | 'Celular' | 'Garage' | 'Otro';
  amount: number;
  date: string;
  dueDate?: string;
  paid: boolean;
  fileName?: string;
}

const ExpenseFixedSchema = new Schema<IExpenseFixed>({
  id: { type: String, required: true, unique: true },
  provider: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  dueDate: { type: String },
  paid: { type: Boolean, default: false },
  fileName: { type: String },
}, { timestamps: true });

export default mongoose.model<IExpenseFixed>('ExpenseFixed', ExpenseFixedSchema);
