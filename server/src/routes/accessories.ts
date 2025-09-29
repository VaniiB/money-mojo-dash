import { Router, Request, Response } from 'express';
import Accessory from '../models/Accessory';

const router = Router();

// List
router.get('/', async (_req: Request, res: Response) => {
  try {
    const docs = await Accessory.find().sort({ createdAt: -1 });
    res.json(docs);
  } catch (e) { res.status(500).json({ error: 'acc:list', message: String(e) }); }
});

// Create
router.post('/', async (req: Request, res: Response) => {
  try {
    const doc = await Accessory.create(req.body);
    res.json(doc);
  } catch (e) { res.status(500).json({ error: 'acc:create', message: String(e) }); }
});

// Update
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await Accessory.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(doc);
  } catch (e) { res.status(500).json({ error: 'acc:update', message: String(e) }); }
});

// Delete
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await Accessory.deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'acc:delete', message: String(e) }); }
});

export default router;
