import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();

const PORT = process.env.PORT ? Number(process.env.PORT) : 8081;
const MONGODB_URI = process.env.MONGODB_URI || '';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:8080';

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

// Soportar múltiples orígenes (CSV) y preflight
const allowedOrigins = CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permitir herramientas sin origen (curl, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin ${origin}`));
  },
  credentials: false,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// DB connect
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err: unknown) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });

// Routes
import settingsRouter from './routes/settings';
import weekDataRouter from './routes/weekData';
import weeklyBillingRouter from './routes/weeklyBilling';
import variableExpensesRouter from './routes/expensesVariable';
import fixedExpensesRouter from './routes/expensesFixed';
import accessoriesRouter from './routes/accessories';
import knownLocalsRouter from './routes/knownLocals';
import mlRouter from './routes/ml';

app.use('/api/settings', settingsRouter);
app.use('/api/week-data', weekDataRouter);
app.use('/api/weekly-billing', weeklyBillingRouter);
app.use('/api/expenses/variable', variableExpensesRouter);
app.use('/api/expenses/fixed', fixedExpensesRouter);
app.use('/api/accessories', accessoriesRouter);
app.use('/api/known-locals', knownLocalsRouter);
app.use('/api/ml', mlRouter);

app.get('/api/health', (_req: Request, res: Response) => {
  const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  res.json({ ok: true, db: { readyState: state } });
});

app.listen(PORT, () => {
  console.log(`Pobrify API running at http://localhost:${PORT}`);
});
