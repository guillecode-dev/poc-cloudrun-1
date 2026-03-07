import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Error operacional conocido. El mensaje SÍ se expone al cliente.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Manejador global de errores — último middleware de Express.
 * NUNCA expone stack traces ni detalles internos al cliente.
 */
export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const isOperational = err instanceof AppError;
  const statusCode = isOperational ? (err as AppError).statusCode : 500;

  // Log completo en servidor (stack incluido)
  logger.error(
    {
      requestId: req.requestId,
      statusCode,
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    },
    'Request error'
  );

  // Respuesta al cliente: solo mensaje seguro
  const clientMessage = isOperational
    ? err.message
    : 'Internal server error';

  res.status(statusCode).json({ error: clientMessage });
}

/**
 * Manejador de rutas no encontradas (404).
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}
