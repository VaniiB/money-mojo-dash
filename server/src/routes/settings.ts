import { Router } from 'express';
import Setting from '../models/Setting';

const router = Router();

// GET one setting by key
router.get('/:key', async (req, res) => {
  try {
    const doc = await Setting.findOne({ key: req.params.key });
    res.json(doc?.data ?? null);
  } catch (e) {
    res.status(500).json({ error: 'settings:get', message: String(e) });
  }
});

// PUT upsert setting by key
router.put('/:key', async (req, res) => {
  try {
    const data = req.body ?? {};
    const doc = await Setting.findOneAndUpdate(
      { key: req.params.key },
      { key: req.params.key, data },
      { new: true, upsert: true }
    );
    res.json(doc?.data ?? null);
  } catch (e) {
    res.status(500).json({ error: 'settings:put', message: String(e) });
  }
});

export default router;
