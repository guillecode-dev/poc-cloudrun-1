-- =============================================================================
-- 001_schema.sql — Schema inicial de la PoC Corp Cloud Run
-- Compatible con: PostgreSQL 15 en Cloud SQL
-- Ejecutar con el usuario propietario de la base de datos (e.g. bff_user)
-- =============================================================================

-- ─── Extensiones ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

-- =============================================================================
-- TABLA: demo_items
-- Catálogo de artículos disponibles para órdenes.
-- =============================================================================
CREATE TABLE IF NOT EXISTS demo_items (
  id         SERIAL       PRIMARY KEY,
  sku        VARCHAR(50)  NOT NULL,
  name       VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT demo_items_sku_unique UNIQUE (sku)
);

COMMENT ON TABLE  demo_items         IS 'Catálogo de artículos del sistema demo.';
COMMENT ON COLUMN demo_items.sku     IS 'Stock Keeping Unit — identificador único de artículo.';
COMMENT ON COLUMN demo_items.name    IS 'Nombre descriptivo del artículo.';

-- Índice para búsquedas por SKU
CREATE INDEX IF NOT EXISTS idx_demo_items_sku ON demo_items (sku);

-- =============================================================================
-- TABLA: demo_orders
-- Órdenes generadas por los usuarios. El total es una columna generada
-- automáticamente por PostgreSQL (qty * price) para garantizar consistencia.
-- =============================================================================
CREATE TABLE IF NOT EXISTS demo_orders (
  id         SERIAL           PRIMARY KEY,
  order_no   VARCHAR(50)      NOT NULL,
  sku        VARCHAR(50)      NOT NULL,
  qty        INTEGER          NOT NULL  CHECK (qty > 0),
  price      NUMERIC(10, 2)   NOT NULL  CHECK (price > 0),
  -- GENERATED ALWAYS AS: PostgreSQL calcula el total; la aplicación no lo envía
  total      NUMERIC(10, 2)   GENERATED ALWAYS AS (qty * price) STORED,
  status     VARCHAR(50)      NOT NULL  DEFAULT 'pending'
               CHECK (status IN ('pending', 'confirmed', 'shipped', 'cancelled')),
  created_at TIMESTAMPTZ      NOT NULL  DEFAULT NOW(),

  CONSTRAINT demo_orders_order_no_unique UNIQUE (order_no)
);

COMMENT ON TABLE  demo_orders         IS 'Órdenes de compra de la demo.';
COMMENT ON COLUMN demo_orders.order_no IS 'Número de orden legible, generado por el BFF.';
COMMENT ON COLUMN demo_orders.total    IS 'Total calculado automáticamente: qty × price.';

-- Índices operacionales
CREATE INDEX IF NOT EXISTS idx_demo_orders_status     ON demo_orders (status);
CREATE INDEX IF NOT EXISTS idx_demo_orders_created_at ON demo_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_orders_sku        ON demo_orders (sku);

-- =============================================================================
-- SEEDS mínimos para demo (idempotentes con ON CONFLICT DO NOTHING)
-- =============================================================================
INSERT INTO demo_items (sku, name) VALUES
  ('PROD-001', 'Laptop Corporativa 14"'),
  ('PROD-002', 'Monitor UltraWide 34"')
ON CONFLICT (sku) DO NOTHING;
