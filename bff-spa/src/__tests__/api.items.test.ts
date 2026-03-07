/**
 * Tests para GET /api/items y POST /api/orders
 * Mockea: authMiddleware, database pool, config, logger
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

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
    allowedOrigins: ['http://localhost:4200'],
  },
}));

jest.mock('../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock del middleware de autenticación
jest.mock('../middleware/auth.middleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = {
      sub: 'test-user-sub-12345',
      name: 'Test User',
      preferred_username: 'testuser@corp.com',
    };
    next();
  },
}));

// Mock del pool de base de datos
const mockQuery = jest.fn();
const mockPool = { query: mockQuery };

jest.mock('../config/database', () => ({
  getPool: jest.fn().mockResolvedValue(mockPool),
  closePool: jest.fn().mockResolvedValue(undefined),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import request from 'supertest';
import { createApp } from '../app';

const MOCK_ITEMS = [
  { id: 1, sku: 'PROD-001', name: 'Laptop Corporativa 14"' },
  { id: 2, sku: 'PROD-002', name: 'Monitor UltraWide 34"' },
];

const MOCK_ORDERS = [
  {
    id: 1,
    order_no: 'ORD-20260307-A3F2',
    status: 'pending',
    total: 999.98,
    created_at: '2026-03-07T13:00:00.000Z',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/items', () => {
  const app = createApp();

  beforeEach(() => {
    mockQuery.mockResolvedValue({ rows: MOCK_ITEMS });
  });

  it('devuelve 200 con el array de items', async () => {
    const res = await request(app)
      .get('/api/items')
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(MOCK_ITEMS);
  });

  it('devuelve exactamente los campos id, sku, name', async () => {
    const res = await request(app)
      .get('/api/items')
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(res.body).toHaveLength(2);
    res.body.forEach((item: any) => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('sku');
      expect(item).toHaveProperty('name');
    });
  });

  it('ejecuta la query correcta sobre demo_items', async () => {
    await request(app)
      .get('/api/items')
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/FROM demo_items/i);
    expect(sql).toMatch(/LIMIT 100/i);
  });

  it('devuelve array vacío si no hay items', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/items')
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('devuelve 500 si la query falla', async () => {
    mockQuery.mockRejectedValue(new Error('DB connection refused'));

    const res = await request(app)
      .get('/api/items')
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Internal server error');
    // Stack trace nunca en la respuesta
    expect(res.body).not.toHaveProperty('stack');
    expect(JSON.stringify(res.body)).not.toMatch(/DB connection refused/);
  });

  it('devuelve Content-Type application/json', async () => {
    const res = await request(app)
      .get('/api/items')
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders', () => {
  const app = createApp();

  beforeEach(() => {
    mockQuery.mockResolvedValue({ rows: MOCK_ORDERS });
  });

  it('devuelve 200 con el array de órdenes', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(MOCK_ORDERS);
  });

  it('los items del array tienen los campos requeridos', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', 'Bearer fake-jwt-token');

    res.body.forEach((order: any) => {
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('order_no');
      expect(order).toHaveProperty('status');
      expect(order).toHaveProperty('total');
      expect(order).toHaveProperty('created_at');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders', () => {
  const app = createApp();

  const CREATED_ORDER = { id: 42, order_no: 'ORD-20260307-X9Z1' };

  beforeEach(() => {
    mockQuery.mockResolvedValue({ rows: [CREATED_ORDER] });
  });

  it('devuelve 201 con { id, order_no } al crear orden válida', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer fake-jwt-token')
      .send({ sku: 'PROD-001', qty: 3, price: 149.99 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 42, order_no: 'ORD-20260307-X9Z1' });
  });

  it('ejecuta INSERT en demo_orders con parámetros correctos', async () => {
    await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer fake-jwt-token')
      .send({ sku: 'PROD-002', qty: 1, price: 299.50 });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO demo_orders/i);
    // total NO debe enviarse (es GENERATED en PostgreSQL)
    expect(sql).not.toMatch(/\$5/); // Solo 4 parámetros: order_no, sku, qty, price
    expect(params[1]).toBe('PROD-002'); // sku
    expect(params[2]).toBe(1);          // qty
    expect(params[3]).toBe(299.50);     // price
  });

  it('devuelve 400 si sku está vacío', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer fake-jwt-token')
      .send({ sku: '', qty: 1, price: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sku/i);
  });

  it('devuelve 400 si qty no es entero positivo', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer fake-jwt-token')
      .send({ sku: 'PROD-001', qty: -5, price: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/qty/i);
  });

  it('devuelve 400 si qty es decimal', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer fake-jwt-token')
      .send({ sku: 'PROD-001', qty: 1.5, price: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/qty/i);
  });

  it('devuelve 400 si price es cero o negativo', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer fake-jwt-token')
      .send({ sku: 'PROD-001', qty: 1, price: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/price/i);
  });

  it('devuelve 400 si faltan campos requeridos', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer fake-jwt-token')
      .send({});

    expect(res.status).toBe(400);
  });

  it('devuelve 500 si el INSERT falla', async () => {
    mockQuery.mockRejectedValue(new Error('unique_violation on order_no'));

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer fake-jwt-token')
      .send({ sku: 'PROD-001', qty: 2, price: 50 });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Internal server error');
    // Detalle interno no expuesto
    expect(JSON.stringify(res.body)).not.toMatch(/unique_violation/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /authz', () => {
  const app = createApp();

  it('devuelve 200 con roles y permissions', async () => {
    const res = await request(app)
      .get('/authz')
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('roles');
    expect(res.body).toHaveProperty('permissions');
    expect(Array.isArray(res.body.roles)).toBe(true);
    expect(Array.isArray(res.body.permissions)).toBe(true);
  });

  it('incluye permisos mínimos de viewer', async () => {
    const res = await request(app)
      .get('/authz')
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(res.body.permissions).toEqual(
      expect.arrayContaining(['items.read', 'orders.read', 'orders.create'])
    );
  });
});
