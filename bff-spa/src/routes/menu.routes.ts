import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as menuService from '../services/menu.service';
import { logger } from '../config/logger';

const router = Router();

// Todas las rutas de menú requieren JWT válido
router.use(authMiddleware);

/**
 * GET /api/menu
 * Devuelve las opciones de menú activas ordenadas para el usuario autenticado.
 * Response 200: MenuItem[]
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await menuService.getMenuItems();

      logger.info(
        { requestId: req.requestId, userId: req.user?.sub, count: items.length },
        'Menu items served'
      );

      res.status(200).json(items);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
