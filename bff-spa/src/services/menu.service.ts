import { getPool } from '../config/database';
import { logger } from '../config/logger';
import { MenuItem } from '../types/index';

interface MenuItemRow {
  id: number;
  label: string;
  route: string;
  target_url: string | null;
  is_embedded: boolean;
  icon: string | null;
  required_role: string;
  sort_order: number;
}

/**
 * Devuelve las opciones de menú activas ordenadas por sort_order.
 * Fuente de verdad: tabla app_menu_items en Cloud SQL.
 */
export async function getMenuItems(): Promise<MenuItem[]> {
  const pool = await getPool();
  const { rows } = await pool.query<MenuItemRow>(
    `SELECT id, label, route, target_url, is_embedded, icon, required_role, sort_order
     FROM app_menu_items
     WHERE is_active = true
     ORDER BY sort_order ASC`
  );

  logger.debug({ count: rows.length }, 'Menu items fetched from DB');

  return rows.map(r => ({
    id: r.id,
    label: r.label,
    route: r.route,
    targetUrl: r.target_url,
    isEmbedded: r.is_embedded,
    icon: r.icon,
    requiredRole: r.required_role,
    sortOrder: r.sort_order,
  }));
}

/**
 * Lee la duración de sesión en minutos desde app_config.
 * Retorna 30 si la clave no existe o el valor no es un número válido.
 */
export async function getSessionDurationMin(): Promise<number> {
  const pool = await getPool();
  const { rows } = await pool.query<{ value: string }>(
    `SELECT value FROM app_config WHERE key = 'session_duration_minutes'`
  );

  if (rows.length === 0) {
    logger.warn({}, 'session_duration_minutes not found in app_config — using default 30');
    return 30;
  }

  const parsed = parseInt(rows[0].value, 10);
  if (isNaN(parsed) || parsed < 1) {
    logger.warn({ raw: rows[0].value }, 'Invalid session_duration_minutes in app_config — using default 30');
    return 30;
  }

  return parsed;
}
