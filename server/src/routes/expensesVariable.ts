import { Router, Request, Response } from 'express';
import ExpenseVariable from '../models/ExpenseVariable';

const router = Router();

// List all
router.get('/', async (_req: Request, res: Response) => {
  try {
    const docs = await ExpenseVariable.find().sort({ date: -1 });
    res.json(docs);
  } catch (e) { res.status(500).json({ error: 'exp-var:list', message: String(e) }); }
});

// Create
router.post('/', async (req: Request, res: Response) => {
  try {
    const doc = await ExpenseVariable.create(req.body);
    res.json(doc);
  } catch (e) { res.status(500).json({ error: 'exp-var:create', message: String(e) }); }
});

// Update
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await ExpenseVariable.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(doc);
  } catch (e) { res.status(500).json({ error: 'exp-var:update', message: String(e) }); }
});

// Delete
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await ExpenseVariable.deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'exp-var:delete', message: String(e) }); }
});

export default router;
