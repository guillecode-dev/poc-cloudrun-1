import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import * as itemsService from '../services/items.service';
import * as ordersService from '../services/orders.service';
import { logger } from '../config/logger';

const router = Router();

// Todas las rutas /api/* requieren JWT válido
router.use(authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/items
 * Response 200: [{ id, sku, name }]
 */
router.get(
  '/items',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await itemsService.getItems();

      logger.info(
        { requestId: req.requestId, userId: req.user?.sub, count: items.length },
        'Items fetched'
      );

      res.status(200).json(items);
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/orders
 * Response 200: [{ id, order_no, status, total, created_at }]
 */
router.get(
  '/orders',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orders = await ordersService.getOrders();

      logger.info(
        { requestId: req.requestId, userId: req.user?.sub, count: orders.length },
        'Orders fetched'
      );

      res.status(200).json(orders);
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/orders
 * Body: { sku: string, qty: number, price: number }
 * Response 201: { id, order_no }
 */
router.post(
  '/orders',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sku, qty, price } = (req.body ?? {}) as {
        sku?: unknown;
        qty?: unknown;
        price?: unknown;
      };

      // ── Validación de entrada ────────────────────────────────────────────
      if (typeof sku !== 'string' || sku.trim().length === 0) {
        throw new AppError(400, '"sku" is required and must be a non-empty string');
      }
      if (sku.trim().length > 50) {
        throw new AppError(400, '"sku" must not exceed 50 characters');
      }
      if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1) {
        throw new AppError(400, '"qty" is required and must be a positive integer');
      }
      if (typeof price !== 'number' || !isFinite(price) || price <= 0) {
        throw new AppError(400, '"price" is required and must be a positive number');
      }

      const result = await ordersService.createOrder({
        sku: sku.trim(),
        qty,
        price,
      });

      logger.info(
        {
          requestId: req.requestId,
          userId: req.user?.sub,
          orderId: result.id,
          orderNo: result.order_no,
        },
        'Order created'
      );

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
