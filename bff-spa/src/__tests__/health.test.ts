/**
 * Tests para GET /healthz
 * No requiere autenticación ni dependencias externas.
 */

// Mockear config antes de importar app
jest.mock('../config/env', () => ({
  config: {
    port: 3000,
    nodeEnv: 'test',
    authTenant: 'test-tenant-id',
    authAuthority: 'https://login.microsoftonline.com/test-tenant-id/v2.0',
    authAudience: 'api://test-client-id',
    authClientId: 'test-client-id',
    firestoreProjectId: 'test-project',
    dbInstance: 'local',
    dbName: 'test_db',
    dbUser: 'test_user',
    dbPassword: 'test_password',
    dbHost: 'localhost',
    dbPort: 5432,
    sessionDurationMin: 60,
    sessionSliding: true,
    sessionMaxMin: 240,
    allowedOrigins: ['http://localhost:4200', 'http://localhost:4300'],
  },
}));

// Silenciar logs durante los tests
jest.mock('../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import request from 'supertest';
import { createApp } from '../app';

describe('GET /healthz', () => {
  const app = createApp();

  it('devuelve 200 con { status: "ok" }', async () => {
    const res = await request(app).get('/healthz');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('devuelve Content-Type application/json', async () => {
    const res = await request(app).get('/healthz');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('devuelve X-Request-Id en la respuesta', async () => {
    const res = await request(app).get('/healthz');

    expect(res.headers['x-request-id']).toBeDefined();
    expect(typeof res.headers['x-request-id']).toBe('string');
  });

  it('propaga X-Request-Id del cliente si se envía', async () => {
    const clientRequestId = 'my-client-request-id-123';
    const res = await request(app)
      .get('/healthz')
      .set('X-Request-Id', clientRequestId);

    expect(res.headers['x-request-id']).toBe(clientRequestId);
  });

  it('devuelve 404 para rutas inexistentes', async () => {
    const res = await request(app).get('/ruta-inexistente');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
