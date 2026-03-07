import { getPool } from '../config/database';
import { Item } from '../types/index';

/**
 * Obtiene los artículos del catálogo desde Cloud SQL.
 * Tabla: demo_items (id, sku, name)
 */
export async function getItems(): Promise<Item[]> {
  const pool = await getPool();

  const { rows } = await pool.query<Item>(
    `SELECT id, sku, name
       FROM demo_items
      ORDER BY id
      LIMIT 100`
  );

  return rows;
}
