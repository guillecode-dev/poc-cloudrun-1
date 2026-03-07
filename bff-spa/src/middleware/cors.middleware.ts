import cors from 'cors';
import { config } from '../config/env';
import { logger } from '../config/logger';

/**
 * CORS con lista blanca explícita (ALLOWED_ORIGINS).
 * Requests sin Origin (curl, server-to-server) son permitidos.
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Sin origin → server-to-server, herramientas CLI
    if (!origin) return callback(null, true);

    if (config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn({ origin }, 'CORS: rejected origin');
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Session-Id',
    'X-Request-Id',
  ],
  exposedHeaders: ['X-Request-Id'],
  credentials: true,
  maxAge: 86_400, // 24h preflight cache
});
