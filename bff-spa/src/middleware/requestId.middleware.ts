import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Asigna un UUID único a cada request para correlación de logs.
 * Si el cliente envía X-Request-Id, se reutiliza (trazabilidad end-to-end).
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
