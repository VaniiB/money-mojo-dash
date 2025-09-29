import { Router, Request, Response } from 'express';
import ExpenseFixed from '../models/ExpenseFixed';

const router = Router();

// List all
router.get('/', async (_req: Request, res: Response) => {
  try {
    const docs = await ExpenseFixed.find().sort({ date: -1 });
    res.json(docs);
  } catch (e) { res.status(500).json({ error: 'exp-fixed:list', message: String(e) }); }
});

// Create
router.post('/', async (req: Request, res: Response) => {
  try {
    const doc = await ExpenseFixed.create(req.body);
    res.json(doc);
  } catch (e) { res.status(500).json({ error: 'exp-fixed:create', message: String(e) }); }
});

// Update
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await ExpenseFixed.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(doc);
  } catch (e) { res.status(500).json({ error: 'exp-fixed:update', message: String(e) }); }
});

// Delete
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await ExpenseFixed.deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'exp-fixed:delete', message: String(e) }); }
});

export default router;
