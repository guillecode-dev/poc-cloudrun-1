import express, { Application } from 'express';
import helmet from 'helmet';

import { corsMiddleware } from './middleware/cors.middleware';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import {
  errorHandlerMiddleware,
  notFoundHandler,
} from './middleware/errorHandler.middleware';
import { logger } from './config/logger';

import healthRoutes  from './routes/health.routes';
import sessionRoutes from './routes/session.routes';
import authzRoutes   from './routes/authz.routes';
import apiRoutes     from './routes/api.routes';

export function createApp(): Application {
  const app = express();

  // Cloud Run termina TLS y reenvía con X-Forwarded-For
  app.set('trust proxy', 1);

  // ── Seguridad ─────────────────────────────────────────────────────────────
  app.use(
    helmet({
      // Las SPAs configuran su propia CSP en nginx
      contentSecurityPolicy: false,
      // Necesario para que los navegadores puedan consumir la API desde otro origen
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(corsMiddleware);

  // ── Request ID ───────────────────────────────────────────────────────────
  app.use(requestIdMiddleware);

  // ── Body parsing ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: '512kb' }));

  // ── Access log ───────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info(
        {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Date.now() - start,
        },
        'Request completed'
      );
    });
    next();
  });

  // ── Rutas ─────────────────────────────────────────────────────────────────
  app.use('/healthz',  healthRoutes);
  app.use('/session',  sessionRoutes);
  app.use('/authz',    authzRoutes);
  app.use('/api',      apiRoutes);

  // ── 404 ───────────────────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ── Error handler global ──────────────────────────────────────────────────
  app.use(errorHandlerMiddleware);

  return app;
}
