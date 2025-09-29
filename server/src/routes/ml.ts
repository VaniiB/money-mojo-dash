import { Router, Request, Response } from 'express';

const router = Router();

// Proxy: GET /api/ml/item/:id -> https://api.mercadolibre.com/items/:id
router.get('/item/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const url = `https://api.mercadolibre.com/items/${encodeURIComponent(id)}`;
    // Usar import dinámico para compatibilidad CommonJS
    const mod = await import('node-fetch');
    const fetchFn = (mod.default ?? (mod as any)) as (input: any, init?: any) => Promise<any>;
    const r = await fetchFn(url);
    const text = await r.text();
    // Intentamos JSON, sino devolvemos texto
    try {
      const json = JSON.parse(text);
      res.status(r.status).json(json);
    } catch {
      res.status(r.status).send(text);
    }
  } catch (e) {
    res.status(500).json({ error: 'ml:item', message: String(e) });
  }
});

export default router;
