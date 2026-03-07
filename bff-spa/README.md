# bff-spa

Backend For Frontend (BFF) para la PoC de arquitectura en GCP Cloud Run.
Node.js 20 LTS + Express 4 + TypeScript. Valida JWT de Azure Entra ID vía JWKS,
gestiona sesiones en Firestore y accede a PostgreSQL en Cloud SQL.

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express 4 |
| Lenguaje | TypeScript 5 |
| Auth | `jsonwebtoken` + `jwks-rsa` (validación JWT RS256) |
| Sesiones | Firestore (modo Native) |
| Base de datos | PostgreSQL 15 vía `@google-cloud/cloud-sql-connector` + `pg` |
| Plataforma | GCP Cloud Run |

---

## Variables de entorno requeridas

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno | `production` |
| `AUTH_TENANT` | Tenant ID de Entra ID | `xxxxxxxx-...` |
| `AUTH_AUTHORITY` | URL de autoridad OIDC | `https://login.microsoftonline.com/<TENANT>/v2.0` |
| `AUTH_AUDIENCE` | Audience esperada en el JWT | `api://<CLIENT_ID>` |
| `AUTH_CLIENT_ID` | Client ID de la API registrada | `yyyyyyyy-...` |
| `FIRESTORE_PROJECT_ID` | Proyecto GCP con Firestore | `my-project` |
| `DB_INSTANCE` | Connection name de Cloud SQL | `projects/p/locations/r/instances/i` |
| `DB_NAME` | Nombre de la base de datos | `poc_db` |
| `DB_USER` | Usuario de PostgreSQL | `bff_user` |
| `DB_PASSWORD` | Contraseña (Secret Manager en prod) | `***` |
| `SESSION_DURATION_MIN` | Duración de sesión en minutos | `60` |
| `SESSION_SLIDING` | Activar sesión deslizante | `true` |
| `SESSION_MAX_MIN` | Máximo absoluto de sesión | `240` |
| `ALLOWED_ORIGINS` | Orígenes CORS (separados por coma) | `https://landing.example.com,https://app.example.com` |

---

## Desarrollo local

### 1. Prerequisitos

- Node.js 20 LTS
- PostgreSQL 15 local
- Cuenta de servicio GCP con acceso a Firestore (opcional para desarrollo sin sesiones)

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar entorno

```bash
cp .env.example .env
# Editar .env con valores reales
```

Para desarrollo local sin Cloud SQL, configurar:
```env
NODE_ENV=development
DB_INSTANCE=local
DB_HOST=localhost
DB_PORT=5432
```

### 4. Schema de base de datos

```sql
CREATE TABLE demo_items (
  id   SERIAL PRIMARY KEY,
  sku  VARCHAR(50)  NOT NULL,
  name VARCHAR(200) NOT NULL
);

CREATE TABLE demo_orders (
  id        SERIAL PRIMARY KEY,
  order_no  VARCHAR(50)    NOT NULL UNIQUE,
  sku       VARCHAR(50)    NOT NULL,
  qty       INTEGER        NOT NULL,
  price     NUMERIC(10, 2) NOT NULL,
  total     NUMERIC(10, 2) NOT NULL,
  status    VARCHAR(50)    NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Datos de prueba
INSERT INTO demo_items (sku, name) VALUES
  ('PROD-001', 'Laptop Corporativa'),
  ('PROD-002', 'Monitor 27"'),
  ('PROD-003', 'Teclado Mecánico');
```

### 5. Iniciar en modo desarrollo

```bash
npm run dev
# Servidor en http://localhost:3000
```

### 6. Build de producción

```bash
npm run build
npm start
```

---

## Docker (Cloud Run)

```bash
# Build
docker build -t bff-spa:local .

# Run local
docker run --rm -p 3000:3000 \
  --env-file .env \
  -e PORT=3000 \
  bff-spa:local
```

---

## Estructura del proyecto

```
bff-spa/
├── src/
│   ├── index.ts                     ← Entry point + graceful shutdown
│   ├── app.ts                       ← Express app (middlewares + rutas)
│   ├── config/
│   │   ├── env.ts                   ← Validación y exportación de variables
│   │   ├── logger.ts                ← Logger JSON estructurado (Cloud Logging)
│   │   ├── firestore.ts             ← Cliente Firestore singleton
│   │   └── database.ts              ← Pool pg (Cloud SQL Connector / TCP)
│   ├── middleware/
│   │   ├── auth.middleware.ts       ← JWT validation via JWKS (RS256)
│   │   ├── cors.middleware.ts       ← CORS con lista blanca ALLOWED_ORIGINS
│   │   ├── requestId.middleware.ts  ← X-Request-Id para correlación de logs
│   │   └── errorHandler.middleware.ts ← Error handler global + AppError
│   ├── routes/
│   │   ├── health.routes.ts         ← GET /healthz
│   │   ├── session.routes.ts        ← POST|GET|DELETE /session/*
│   │   ├── authz.routes.ts          ← GET /authz
│   │   └── api.routes.ts            ← GET|POST /api/*
│   ├── services/
│   │   ├── session.service.ts       ← CRUD Firestore + sliding window
│   │   ├── items.service.ts         ← SELECT demo_items
│   │   └── orders.service.ts        ← SELECT/INSERT demo_orders
│   └── types/
│       ├── express.d.ts             ← Augmentación Request (requestId, user)
│       └── index.ts                 ← Item, Order, CreateOrderDto, SessionData
├── Dockerfile
├── .env.example
├── nodemon.json
├── package.json
└── tsconfig.json
```

---

## API — Ejemplos curl

> Sustituir `TOKEN` con un JWT válido de Entra ID.
> Sustituir `SESSION_ID` con el valor devuelto por `/session/handshake`.

### GET /healthz

```bash
curl -s http://localhost:3000/healthz | jq
# { "status": "ok" }
```

---

### POST /session/handshake

```bash
curl -s -X POST http://localhost:3000/session/handshake \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

```json
{
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "userId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "expireAt": "2026-03-07T14:00:00.000Z"
}
```

Con `handoff_token` opcional:

```bash
curl -s -X POST http://localhost:3000/session/handshake \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"handoff_token": "optional-cross-app-token"}' | jq
```

---

### GET /session/validate

```bash
curl -s http://localhost:3000/session/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Session-Id: $SESSION_ID" | jq
```

```json
{ "valid": true, "expireAt": "2026-03-07T15:00:00.000Z" }
```

Sesión inválida o expirada → HTTP 401:
```json
{ "valid": false }
```

---

### DELETE /session

```bash
curl -s -X DELETE http://localhost:3000/session \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Session-Id: $SESSION_ID"
# HTTP 204 — sin cuerpo
```

---

### GET /authz

```bash
curl -s http://localhost:3000/authz \
  -H "Authorization: Bearer $TOKEN" | jq
```

```json
{
  "roles": ["viewer"],
  "permissions": ["items.read", "orders.read", "orders.create"]
}
```

---

### GET /api/items

```bash
curl -s http://localhost:3000/api/items \
  -H "Authorization: Bearer $TOKEN" | jq
```

```json
[
  { "id": 1, "sku": "PROD-001", "name": "Laptop Corporativa" },
  { "id": 2, "sku": "PROD-002", "name": "Monitor 27\"" },
  { "id": 3, "sku": "PROD-003", "name": "Teclado Mecánico" }
]
```

---

### GET /api/orders

```bash
curl -s http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" | jq
```

```json
[
  {
    "id": 1,
    "order_no": "ORD-20260307-A3F2",
    "status": "pending",
    "total": 999.99,
    "created_at": "2026-03-07T13:00:00.000Z"
  }
]
```

---

### POST /api/orders

```bash
curl -s -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sku": "PROD-001", "qty": 2, "price": 499.99}' | jq
```

```json
{ "id": 2, "order_no": "ORD-20260307-B7C1" }
```

Errores de validación → HTTP 400:
```bash
curl -s -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sku": "", "qty": -1, "price": 0}' | jq
# { "error": "\"sku\" is required and must be a non-empty string" }
```

---

## Seguridad

| Mecanismo | Implementación |
|---|---|
| Validación JWT | `jwks-rsa` + `jsonwebtoken` — RS256, iss, aud, exp |
| Tokens en memoria | Solo en proceso Node.js; nunca escritos a disco |
| Stack traces | Nunca expuestos al cliente (solo logueados en servidor) |
| CORS | Lista blanca explícita via `ALLOWED_ORIGINS` |
| Helmet | Cabeceras de seguridad HTTP en todas las respuestas |
| Secretos | Variables de entorno / Secret Manager — ninguno en código fuente |
| Sesión | Firestore con TTL + límite absoluto + sliding window opcional |
| Docker | Multi-stage + usuario `node` (no-root, uid=1000) |

---

## Firestore — Estructura de sesiones

```
sessions/                            ← colección
  {userId}/                         ← documento (contenedor por usuario)
    entries/                        ← subcolección
      {sessionId}                   ← documento de sesión
        sessionId: string
        userId: string
        createdAt: Timestamp
        expireAt: Timestamp
        lastAccessedAt: Timestamp
```

La sesión deslizante (`SESSION_SLIDING=true`) actualiza `expireAt` y `lastAccessedAt`
en cada `GET /session/validate`, respetando siempre el límite absoluto `SESSION_MAX_MIN`.
