import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import * as sessionService from '../services/session.service';
import * as menuService from '../services/menu.service';
import { config } from '../config/env';
import { logger } from '../config/logger';

const router = Router();

// Todas las rutas de sesión requieren JWT válido
router.use(authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /session/handshake
 * Body: { handoff_token?: string }
 *
 * Crea una nueva sesión en Firestore para el usuario autenticado.
 * Lee la duración de sesión y las opciones de menú desde Cloud SQL.
 *
 * Response 200: { sessionId, userId, expireAt, sessionDurationMin, menuItems }
 */
router.post(
  '/handshake',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new AppError(401, 'Missing sub claim in token');

      const { handoff_token } = req.body ?? {};
      if (handoff_token) {
        logger.info({ requestId: req.requestId, userId, hasHandoffToken: true },
          'Handshake with handoff_token');
      }

      // Leer configuración y menú desde Cloud SQL en paralelo
      const [sessionDurationMin, menuItems] = await Promise.all([
        menuService.getSessionDurationMin(),
        menuService.getMenuItems(),
      ]);

      const session = await sessionService.createSession(userId, sessionDurationMin, menuItems);

      logger.info(
        { requestId: req.requestId, userId, sessionId: session.sessionId, sessionDurationMin },
        'Session handshake completed'
      );

      res.status(200).json({
        sessionId: session.sessionId,
        userId: session.userId,
        expireAt: session.expireAt.toISOString(),
        sessionDurationMin: session.sessionDurationMin,
        menuItems: session.menuItems,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /session/validate
 * Header: X-Session-Id: <sessionId>
 *
 * Valida la sesión. Si SESSION_SLIDING=true, extiende expireAt.
 *
 * Response 200: { valid: true, expireAt, menuItems }
 * Response 401: { valid: false }
 */
router.get(
  '/validate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new AppError(401, 'Missing sub claim in token');

      const sessionId = req.headers['x-session-id'] as string | undefined;
      if (!sessionId) throw new AppError(400, 'Missing X-Session-Id header');

      const session = await sessionService.validateSession(
        userId,
        sessionId,
        config.sessionMaxMin,
        config.sessionSliding,
        config.sessionDurationMin
      );

      if (!session) {
        res.status(401).json({ valid: false });
        return;
      }

      logger.info(
        { requestId: req.requestId, userId, sessionId },
        'Session validated'
      );

      res.status(200).json({
        valid: true,
        expireAt: session.expireAt.toISOString(),
        menuItems: session.menuItems,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * DELETE /session
 * Header: X-Session-Id: <sessionId>
 *
 * Elimina la sesión de Firestore (logout explícito).
 *
 * Response 204: sin cuerpo
 */
router.delete(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new AppError(401, 'Missing sub claim in token');

      const sessionId = req.headers['x-session-id'] as string | undefined;
      if (!sessionId) throw new AppError(400, 'Missing X-Session-Id header');

      await sessionService.deleteSession(userId, sessionId);

      logger.info(
        { requestId: req.requestId, userId, sessionId },
        'Session deleted via DELETE /session'
      );

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
