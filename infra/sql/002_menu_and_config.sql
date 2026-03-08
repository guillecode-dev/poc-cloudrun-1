-- =============================================================================
-- 002_menu_and_config.sql — Menú dinámico y configuración de aplicación
-- Compatible con: PostgreSQL 15 en Cloud SQL
-- Ejecutar tras 001_schema.sql
-- =============================================================================

-- =============================================================================
-- TABLA: app_config
-- Pares clave-valor para configuración de la plataforma sin redespliegue.
-- =============================================================================
CREATE TABLE IF NOT EXISTS app_config (
  key         VARCHAR(100)  PRIMARY KEY,
  value       VARCHAR(500)  NOT NULL,
  description VARCHAR(500),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  app_config             IS 'Configuración de la plataforma editable sin redespliegue.';
COMMENT ON COLUMN app_config.key         IS 'Clave única de la configuración.';
COMMENT ON COLUMN app_config.value       IS 'Valor en formato texto; el BFF lo convierte al tipo requerido.';
COMMENT ON COLUMN app_config.description IS 'Descripción del parámetro para documentación interna.';

-- =============================================================================
-- TABLA: app_menu_items
-- Opciones del menú de navegación de la plataforma, configurables desde BD.
-- =============================================================================
CREATE TABLE IF NOT EXISTS app_menu_items (
  id            SERIAL        PRIMARY KEY,
  label         VARCHAR(100)  NOT NULL,
  route         VARCHAR(200)  NOT NULL,
  target_url    VARCHAR(500),               -- URL de la micro-app a embeber (NULL = ruta local del shell)
  is_embedded   BOOLEAN       NOT NULL DEFAULT false,  -- true → renderizar en iframe dentro del shell
  icon          VARCHAR(100),               -- nombre del icono (opcional, uso futuro)
  required_role VARCHAR(100)  NOT NULL DEFAULT 'authenticated',
  sort_order    INTEGER       NOT NULL DEFAULT 0,
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  app_menu_items              IS 'Opciones del menú de la plataforma, configurables sin redespliegue.';
COMMENT ON COLUMN app_menu_items.route        IS 'Ruta del Angular router dentro del shell (ej. /demo).';
COMMENT ON COLUMN app_menu_items.target_url   IS 'URL completa de la micro-app a embeber en iframe. NULL si es ruta local.';
COMMENT ON COLUMN app_menu_items.is_embedded  IS 'Indica que el contenido se carga en un iframe dentro del shell.';
COMMENT ON COLUMN app_menu_items.required_role IS 'Rol mínimo requerido (authenticated / admin). El BFF filtra por roles futuros.';

CREATE INDEX IF NOT EXISTS idx_app_menu_items_sort   ON app_menu_items (sort_order ASC) WHERE is_active = true;

-- =============================================================================
-- SEEDS — Configuración inicial (idempotentes)
-- =============================================================================

-- Duración de sesión: 30 minutos por defecto, configurable sin redespliegue
INSERT INTO app_config (key, value, description) VALUES
  ('session_duration_minutes', '30',
   'Duración de sesión de usuario en minutos. Aplica a nuevas sesiones. Reiniciar BFF no es necesario.')
ON CONFLICT (key) DO NOTHING;

-- Menú inicial de la plataforma.
-- NOTA: Para producción, reemplazar NULL en target_url con la URL real del Cloud Run service:
--   UPDATE app_menu_items SET target_url = 'https://app-demo-spa-<hash>-uc.a.run.app'
--   WHERE route = '/demo';
-- El campo target_url es referencial (documentación/futuro uso); la URL del remote
-- se configura hoy via la variable de entorno DEMO_APP_URL en landing-spa.
INSERT INTO app_menu_items (label, route, target_url, is_embedded, icon, required_role, sort_order) VALUES
  ('Inicio',    '/',        NULL,    false, 'home',      'authenticated', 0),
  ('Perfil',    '/profile', NULL,    false, 'person',    'authenticated', 1),
  ('Demo App',  '/demo',    NULL,    true,  'dashboard', 'authenticated', 2)
ON CONFLICT DO NOTHING;
