import { getPool } from '../config/database';
import { Order, CreateOrderDto } from '../types/index';

/**
 * Genera un número de orden único con formato ORD-YYYYMMDD-XXXX.
 */
function generateOrderNo(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${dateStr}-${suffix}`;
}

/**
 * Obtiene las órdenes más recientes desde Cloud SQL.
 * Tabla: demo_orders (id, order_no, status, total, created_at)
 */
export async function getOrders(): Promise<Order[]> {
  const pool = await getPool();

  const { rows } = await pool.query<Order>(
    `SELECT id,
            order_no,
            status,
            total::float AS total,
            created_at
       FROM demo_orders
      ORDER BY created_at DESC
      LIMIT 200`
  );

  return rows;
}

/**
 * Crea una nueva orden en Cloud SQL.
 * `total` es una columna GENERATED ALWAYS AS (qty * price) STORED en PostgreSQL;
 * el BFF no la envía — PostgreSQL la calcula automáticamente.
 * Retorna { id, order_no } tal como especifica la API.
 */
export async function createOrder(
  dto: CreateOrderDto
): Promise<{ id: number; order_no: string }> {
  const pool = await getPool();

  const orderNo = generateOrderNo();

  const { rows } = await pool.query<{ id: number; order_no: string }>(
    `INSERT INTO demo_orders (order_no, sku, qty, price, status)
          VALUES ($1, $2, $3, $4, 'pending')
     RETURNING id, order_no`,
    [orderNo, dto.sku, dto.qty, dto.price]
  );

  return rows[0]!;
}
