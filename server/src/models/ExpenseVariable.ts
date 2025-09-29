import mongoose, { Schema } from 'mongoose';

export interface IExpenseVariable {
  id: string;
  date: string;
  category: 'nafta' | 'comida' | 'verduleria' | 'supermercado' | 'mascota' | 'servicios' | 'otros';
  description: string;
  amount: number;
  paymentMethod: 'efectivo' | 'transferencia' | 'tarjeta';
  dueDate?: string;
}

const ExpenseVariableSchema = new Schema<IExpenseVariable>({
  id: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  dueDate: { type: String },
}, { timestamps: true });

export default mongoose.model<IExpenseVariable>('ExpenseVariable', ExpenseVariableSchema);
