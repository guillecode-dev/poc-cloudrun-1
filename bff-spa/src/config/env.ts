import * as dotenv from 'dotenv';

// Cargar .env en entornos distintos a producción
if (process.env['NODE_ENV'] !== 'production') {
  dotenv.config();
}

function required(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export const config = {
  port: parseInt(optional('PORT', '3000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),

  // Azure Entra ID
  authTenant: required('AUTH_TENANT'),
  authAuthority: required('AUTH_AUTHORITY'),
  authAudience: required('AUTH_AUDIENCE'),
  authClientId: required('AUTH_CLIENT_ID'),

  // Firestore
  firestoreProjectId: required('FIRESTORE_PROJECT_ID'),

  // Cloud SQL / PostgreSQL
  dbInstance: required('DB_INSTANCE'),
  dbName: required('DB_NAME'),
  dbUser: required('DB_USER'),
  dbPassword: required('DB_PASSWORD'),
  dbHost: optional('DB_HOST', 'localhost'),
  dbPort: parseInt(optional('DB_PORT', '5432'), 10),

  // Sesión
  sessionDurationMin: parseInt(optional('SESSION_DURATION_MIN', '60'), 10),
  sessionSliding: optional('SESSION_SLIDING', 'true') === 'true',
  sessionMaxMin: parseInt(optional('SESSION_MAX_MIN', '240'), 10),

  // CORS
  allowedOrigins: optional('ALLOWED_ORIGINS', 'http://localhost:4200,http://localhost:4300')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
} as const;
