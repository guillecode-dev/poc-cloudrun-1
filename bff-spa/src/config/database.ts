import { Pool } from 'pg';
import { config } from './env';
import { logger } from './logger';

let poolInstance: Pool | null = null;

/**
 * Devuelve el pool de conexiones PostgreSQL singleton.
 *
 * - Producción (NODE_ENV=production): usa Cloud SQL Connector para conectar
 *   a Cloud SQL sin IP pública expuesta, con IAM auth automático.
 * - Desarrollo local: conexión TCP directa (DB_HOST / DB_PORT).
 */
export async function getPool(): Promise<Pool> {
  if (poolInstance) return poolInstance;

  const poolConfig = {
    database: config.dbName,
    user: config.dbUser,
    password: config.dbPassword,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };

  if (config.nodeEnv === 'production') {
    // Cloud SQL Auth Proxy vía Connector (sin abrir puertos TCP en producción)
    const { Connector, IpAddressTypes } = await import('@google-cloud/cloud-sql-connector');
    const connector = new Connector();
    const clientOpts = await connector.getOptions({
      instanceConnectionName: config.dbInstance,
      ipType: IpAddressTypes.PUBLIC, // usar PRIVATE si VPC está configurada
    });

    poolInstance = new Pool({ ...clientOpts, ...poolConfig });
    logger.info({ dbInstance: config.dbInstance }, 'Database pool initialized via Cloud SQL Connector');
  } else {
    // Conexión TCP directa para desarrollo local / CI
    poolInstance = new Pool({
      host: config.dbHost,
      port: config.dbPort,
      ...poolConfig,
    });
    logger.info({ host: config.dbHost, port: config.dbPort, dbName: config.dbName },
      'Database pool initialized (direct TCP)');
  }

  poolInstance.on('error', err => {
    logger.error({ errorMessage: err.message }, 'Unexpected idle DB client error');
  });

  return poolInstance;
}

export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    logger.info({}, 'Database pool closed');
  }
}
