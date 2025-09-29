import { Router } from 'express';
import WeekData from '../models/WeekData';

const router = Router();

// List all days (optionally by week range)
router.get('/', async (req, res) => {
  try {
    const { start, end } = req.query as { start?: string; end?: string };
    const q: any = {};
    if (start && end) q.date = { $gte: start, $lte: end };
    const docs = await WeekData.find(q).sort({ date: 1 });
    res.json(docs);
  } catch (e) { res.status(500).json({ error: 'weekdata:list', message: String(e) }); }
});

// Upsert a day by date
router.put('/:date', async (req, res) => {
  try {
    const date = req.params.date;
    const payload = req.body;
    const doc = await WeekData.findOneAndUpdate({ date }, { ...payload, date }, { new: true, upsert: true });
    res.json(doc);
  } catch (e) { res.status(500).json({ error: 'weekdata:upsert', message: String(e) }); }
});

// Delete a day
router.delete('/:date', async (req, res) => {
  try {
    await WeekData.deleteOne({ date: req.params.date });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'weekdata:delete', message: String(e) }); }
});

export default router;
