import { Router, Request, Response } from 'express';
import KnownLocal from '../models/KnownLocal';

const router = Router();

// List
router.get('/', async (_req: Request, res: Response) => {
  try {
    const docs = await KnownLocal.find().sort({ name: 1 });
    res.json(docs);
  } catch (e) { res.status(500).json({ error: 'locals:list', message: String(e) }); }
});

// Upsert by name
router.put('/:name', async (req: Request, res: Response) => {
  try {
    const name = req.params.name;
    const doc = await KnownLocal.findOneAndUpdate(
      { name },
      { name, ...req.body },
      { new: true, upsert: true }
    );
    res.json(doc);
  } catch (e) { res.status(500).json({ error: 'locals:put', message: String(e) }); }
});

// Delete
router.delete('/:name', async (req: Request, res: Response) => {
  try {
    await KnownLocal.deleteOne({ name: req.params.name });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'locals:delete', message: String(e) }); }
});

export default router;
