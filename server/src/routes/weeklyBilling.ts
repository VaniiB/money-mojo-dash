import { Router } from 'express';
import WeeklyBilling from '../models/WeeklyBilling';

const router = Router();

// Get one week by key (YYYY-MM-DD)
router.get('/:weekKey', async (req, res) => {
  try {
    const doc = await WeeklyBilling.findOne({ weekKey: req.params.weekKey });
    res.json(doc ?? null);
  } catch (e) {
    res.status(500).json({ error: 'weeklyBilling:get', message: String(e) });
  }
});

// Upsert a week
router.put('/:weekKey', async (req, res) => {
  try {
    const doc = await WeeklyBilling.findOneAndUpdate(
      { weekKey: req.params.weekKey },
      { ...req.body, weekKey: req.params.weekKey },
      { new: true, upsert: true }
    );
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: 'weeklyBilling:put', message: String(e) });
  }
});

export default router;
