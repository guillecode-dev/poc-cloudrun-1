import { Router } from 'express';

const router = Router();

/**
 * GET /healthz
 * Health check para Cloud Run.
 * No requiere autenticación.
 */
router.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
