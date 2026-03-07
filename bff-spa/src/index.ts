import { createApp } from './app';
import { config } from './config/env';
import { logger } from './config/logger';
import { getPool, closePool } from './config/database';

async function main(): Promise<void> {
  // Pre-calentar el pool de BD antes de aceptar tráfico
  await getPool();

  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, nodeEnv: config.nodeEnv },
      'BFF SPA server started'
    );
  });

  // ── Graceful shutdown para Cloud Run (SIGTERM) ────────────────────────────
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received — draining connections');

    server.close(async () => {
      await closePool();
      logger.info({}, 'Graceful shutdown complete');
      process.exit(0);
    });

    // Forzar salida si drain no termina en 10 s
    setTimeout(() => {
      logger.error({}, 'Graceful shutdown timeout — forcing exit');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('uncaughtException', err => {
    logger.error({ errorMessage: err.message, stack: err.stack }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason: String(reason) }, 'Unhandled promise rejection');
    process.exit(1);
  });
}

main().catch(err => {
  // Errores de startup (ej: variables de entorno faltantes)
  console.error('FATAL: startup failed', err);
  process.exit(1);
});
