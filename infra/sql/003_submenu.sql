-- =============================================================================
-- 003_submenu.sql — Soporte de sub-menú con jerarquía parent/child
-- Ejecutar tras 002_menu_and_config.sql
-- =============================================================================

-- Agregar columna parent_id (auto-referencia)
ALTER TABLE app_menu_items
  ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES app_menu_items(id) ON DELETE SET NULL;

-- Demo App pasa a ser solo un trigger de dropdown (sin ruta directa)
UPDATE app_menu_items SET route = '' WHERE label = 'Demo App' AND parent_id IS NULL;

-- Sub-ítems de Demo App (idempotente: solo inserta si no existen)
INSERT INTO app_menu_items (label, route, parent_id, is_embedded, icon, required_role, sort_order)
SELECT 'Artículos', '/demo/items',
       (SELECT id FROM app_menu_items WHERE label = 'Demo App' AND parent_id IS NULL),
       true, 'inventory', 'authenticated', 0
WHERE NOT EXISTS (
  SELECT 1 FROM app_menu_items WHERE label = 'Artículos'
);

INSERT INTO app_menu_items (label, route, parent_id, is_embedded, icon, required_role, sort_order)
SELECT 'Proveedores', '/demo/providers',
       (SELECT id FROM app_menu_items WHERE label = 'Demo App' AND parent_id IS NULL),
       true, 'business', 'authenticated', 1
WHERE NOT EXISTS (
  SELECT 1 FROM app_menu_items WHERE label = 'Proveedores'
);
