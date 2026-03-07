# PoC Arquitectura Estándar — GCP Cloud Run

Prueba de concepto de arquitectura corporativa sobre Google Cloud Platform.
Tres servicios en Cloud Run, autenticación Azure Entra ID (PKCE), sesiones en
Firestore y datos relacionales en PostgreSQL 15 (Cloud SQL).

---

## Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Usuario / Navegador                        │
└───────────────┬─────────────────────────────┬───────────────────────┘
                │                             │
                ▼                             ▼
  ┌─────────────────────────┐   ┌─────────────────────────────────┐
  │      landing-spa        │   │         app-demo-spa            │
  │  Angular 17+ (PKCE)     │   │  Angular 17+ + Material         │
  │  Cloud Run (nginx)      │   │  Cloud Run (nginx)              │
  └────────────┬────────────┘   └─────────────┬───────────────────┘
               │ Bearer JWT                    │ Bearer JWT
               │ POST /session/handshake       │ GET /api/items
               │                               │ GET|POST /api/orders
               └───────────────┬───────────────┘
                                │
                    ┌───────────▼───────────┐
                    │       bff-spa         │
                    │  Node.js 20 + Express │
                    │  Cloud Run            │
                    └──────┬──────┬─────────┘
                           │      │
              ┌────────────┘      └────────────────┐
              ▼                                    ▼
  ┌───────────────────────┐          ┌─────────────────────────┐
  │  Firestore (Native)   │          │  Cloud SQL (PostgreSQL)  │
  │  sessions/{uid}/      │          │  demo_items              │
  │    entries/{sid}      │          │  demo_orders             │
  └───────────────────────┘          └─────────────────────────┘

              Azure Entra ID (IdP)
              ┌────────────────────┐
              │  OIDC / PKCE       │
              │  JWKS endpoint     │
              │  Token validation  │
              └────────────────────┘
```

---

## Servicios

| Servicio | Descripción | Puerto | Auth |
|---|---|---|---|
| `landing-spa` | SPA pública de entrada. Login PKCE, perfil con claims | 8080 | Pública |
| `app-demo-spa` | SPA con tablas Artículos/Órdenes y formulario reactivo | 8080 | Pública |
| `bff-spa` | Backend For Frontend. Valida JWT, gestiona sesiones, accede a DB | 8080 | WIF (no pública) |

### Endpoints del BFF

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/healthz` | No | Health check para Cloud Run |
| `POST` | `/session/handshake` | JWT | Crea sesión en Firestore |
| `GET` | `/session/validate` | JWT + X-Session-Id | Valida sesión (sliding opcional) |
| `DELETE` | `/session` | JWT + X-Session-Id | Elimina sesión (logout) |
| `GET` | `/authz` | JWT | Devuelve roles y permisos |
| `GET` | `/api/items` | JWT | Lista artículos desde Cloud SQL |
| `GET` | `/api/orders` | JWT | Lista órdenes desde Cloud SQL |
| `POST` | `/api/orders` | JWT | Crea orden en Cloud SQL |

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | TypeScript, Angular 17+ (standalone), Angular Material 17 |
| Auth client | `@azure/msal-angular` v3 + `@azure/msal-browser` v3 (PKCE) |
| BFF | Node.js 20 LTS, Express 4, TypeScript 5 |
| JWT validation | `jwks-rsa` + `jsonwebtoken` (RS256, JWKS cache 24 h) |
| Sesiones | Firestore (modo Native) — sliding window + límite absoluto |
| Base de datos | PostgreSQL 15 en Cloud SQL (columna `total` GENERATED) |
| DB connector | `@google-cloud/cloud-sql-connector` + `pg` |
| Contenedores | Docker multi-stage, nginx:1.27-alpine / node:20-alpine |
| Plataforma | GCP Cloud Run, Artifact Registry, Secret Manager |
| CI/CD | GitHub Actions + Workload Identity Federation (WIF) |
| Auth IdP | Azure Entra ID (OIDC, PKCE, Authorization Code Flow) |

---

## Prerrequisitos de infraestructura GCP

Antes del primer despliegue, crear manualmente (o vía Terraform):

### 1. APIs habilitadas

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  firestore.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com
```

### 2. Artifact Registry

```bash
gcloud artifacts repositories create poc-repos \
  --repository-format docker \
  --location $GCP_REGION \
  --description "PoC Cloud Run Docker images"
```

### 3. Cloud SQL (PostgreSQL 15)

```bash
gcloud sql instances create poc-postgres \
  --database-version POSTGRES_15 \
  --tier db-f1-micro \
  --region $GCP_REGION

gcloud sql databases create poc_db --instance poc-postgres

gcloud sql users create bff_user \
  --instance poc-postgres \
  --password "$(openssl rand -base64 24)"
```

Aplicar el schema:

```bash
gcloud sql connect poc-postgres --user bff_user --database poc_db
# Pegar contenido de infra/sql/001_schema.sql
```

### 4. Firestore (modo Native)

```bash
gcloud firestore databases create \
  --location $GCP_REGION \
  --type FIRESTORE_NATIVE

# Desplegar índices
gcloud firestore indexes composite create \
  --collection-group=entries \
  --query-scope=COLLECTION \
  --field-config field-path=userId,order=ASCENDING \
  --field-config field-path=expireAt,order=ASCENDING
```

### 5. Secret Manager

```bash
# Crear cada secreto
for SECRET in AUTH_TENANT AUTH_AUTHORITY AUTH_AUDIENCE AUTH_CLIENT_ID \
              FIRESTORE_PROJECT_ID DB_INSTANCE DB_NAME DB_USER DB_PASSWORD \
              ALLOWED_ORIGINS; do
  echo -n "VALOR" | gcloud secrets create $SECRET --data-file=-
done
```

### 6. Workload Identity Federation (WIF)

```bash
# Pool
gcloud iam workload-identity-pools create github-pool \
  --location global \
  --display-name "GitHub Actions Pool"

# Provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location global \
  --workload-identity-pool github-pool \
  --display-name "GitHub Provider" \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri "https://token.actions.githubusercontent.com"

# Service Account para el deploy
gcloud iam service-accounts create github-deploy-sa \
  --display-name "GitHub Deploy SA"

# Binding WIF → SA
gcloud iam service-accounts add-iam-policy-binding \
  github-deploy-sa@$GCP_PROJECT.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/ORG/REPO"

# Roles mínimos para el SA
gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member serviceAccount:github-deploy-sa@$GCP_PROJECT.iam.gserviceaccount.com \
  --role roles/run.admin

gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member serviceAccount:github-deploy-sa@$GCP_PROJECT.iam.gserviceaccount.com \
  --role roles/artifactregistry.writer

gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member serviceAccount:github-deploy-sa@$GCP_PROJECT.iam.gserviceaccount.com \
  --role roles/secretmanager.secretAccessor
```

### 7. GitHub Secrets requeridos

| Secret | Descripción | Ejemplo |
|---|---|---|
| `GCP_PROJECT` | ID del proyecto GCP | `my-project-123` |
| `GCP_REGION` | Región de despliegue | `us-central1` |
| `WIF_PROVIDER` | WIF provider resource name | `projects/123/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `WIF_SA` | Email del service account | `github-deploy-sa@my-project.iam.gserviceaccount.com` |

---

## Desarrollo local

### Requisitos

- Node.js 20 LTS
- Angular CLI 17+: `npm install -g @angular/cli`
- Docker Desktop
- PostgreSQL 15 local (o Docker)
- Cuenta de servicio GCP con acceso a Firestore (para tests de integración)

### Setup completo

```bash
# 1. Clonar
git clone https://github.com/ORG/poc-satelites.git
cd poc-satelites

# 2. BFF
cd bff-spa
cp .env.example .env
# Editar .env con valores locales
npm install
npm run dev        # http://localhost:3000

# 3. Landing SPA
cd ../landing-spa
npm install
ng serve           # http://localhost:4200

# 4. App Demo SPA
cd ../app-demo-spa
npm install
ng serve --port 4300   # http://localhost:4300
```

### Ejecutar tests del BFF

```bash
cd bff-spa
npm test              # Tests unitarios
npm run test:coverage # Con reporte de cobertura
```

---

## Deploy manual (sin CI/CD)

```bash
GCP_PROJECT=mi-proyecto
GCP_REGION=us-central1
REGISTRY=${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/poc-repos
SHA=$(git rev-parse --short HEAD)

# Autenticar Docker
gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev

# BFF
docker build -t ${REGISTRY}/bff-spa:${SHA} ./bff-spa
docker push ${REGISTRY}/bff-spa:${SHA}
gcloud run deploy bff-spa \
  --image ${REGISTRY}/bff-spa:${SHA} \
  --region ${GCP_REGION} \
  --no-allow-unauthenticated

# Landing SPA
docker build -t ${REGISTRY}/landing-spa:${SHA} ./landing-spa
docker push ${REGISTRY}/landing-spa:${SHA}
gcloud run deploy landing-spa \
  --image ${REGISTRY}/landing-spa:${SHA} \
  --region ${GCP_REGION} \
  --allow-unauthenticated

# App Demo SPA
docker build -t ${REGISTRY}/app-demo-spa:${SHA} ./app-demo-spa
docker push ${REGISTRY}/app-demo-spa:${SHA}
gcloud run deploy app-demo-spa \
  --image ${REGISTRY}/app-demo-spa:${SHA} \
  --region ${GCP_REGION} \
  --allow-unauthenticated
```

---

## Estructura del repositorio

```
poc-satelites/
├── landing-spa/               # SPA Angular 17+ — Login PKCE + Perfil
│   ├── src/app/
│   │   ├── app.config.ts      # MSAL + MsalGuard + authInterceptor
│   │   ├── pages/home/        # Botón Login/Logout
│   │   └── pages/profile/     # Claims del ID Token
│   ├── Dockerfile             # ng build + nginx:alpine
│   └── nginx.conf             # Plantilla con ${PORT}
│
├── app-demo-spa/              # SPA Angular 17+ — Artículos + Órdenes
│   ├── src/app/
│   │   ├── app.config.ts      # MSAL + APP_INITIALIZER (handshake)
│   │   ├── pages/items/       # MatTable con sort y paginación
│   │   └── pages/orders/      # MatTable + ReactiveForm
│   ├── Dockerfile
│   └── nginx.conf
│
├── bff-spa/                   # Backend For Frontend (Node.js/Express)
│   ├── src/
│   │   ├── config/            # env, logger, firestore, database
│   │   ├── middleware/        # auth (JWKS), cors, requestId, errorHandler
│   │   ├── routes/            # health, session, authz, api
│   │   ├── services/          # session (Firestore), items, orders (pg)
│   │   └── __tests__/         # Jest + supertest (health, session, api)
│   └── Dockerfile             # tsc build + node:20-alpine
│
├── infra/
│   ├── sql/001_schema.sql     # demo_items + demo_orders (total GENERATED)
│   └── firestore/
│       └── firestore.indexes.json
│
├── .github/
│   └── workflows/deploy.yml   # lint → test → build-docker → deploy-cloud-run
│
└── docs/
    └── README.md              # Este archivo
```

---

## Decisiones de arquitectura

### Seguridad

| Decisión | Justificación |
|---|---|
| PKCE (Authorization Code + PKCE) | No hay client_secret en el navegador; protege contra code interception |
| Tokens en memoria JS | No persisten entre sesiones ni en localStorage/sessionStorage |
| JWT validado en BFF (JWKS) | El BFF verifica firma, issuer, audience y expiración antes de cada operación |
| `GENERATED ALWAYS AS` para `total` | PostgreSQL garantiza consistencia; el BFF no puede insertar valores incorrectos |
| WIF en CI/CD | Cero JSON keys en GitHub; tokens de corta duración generados por OIDC |
| Helm no requerido | Cloud Run gestiona escala, rolling updates y rollbacks de forma nativa |

### Sesiones

- **Creación**: `POST /session/handshake` → documento Firestore `sessions/{userId}/entries/{sessionId}`
- **Validación + Sliding**: `GET /session/validate` → extiende `expireAt` si `SESSION_SLIDING=true`, respetando `SESSION_MAX_MIN`
- **Límite absoluto**: calculado como `createdAt + SESSION_MAX_MIN`; no puede superarse aunque se deslice
- **Logout**: `DELETE /session` → borrado inmediato del documento

### Observabilidad

Todos los servicios emiten logs JSON estructurados con:
```json
{
  "timestamp": "2026-03-07T13:00:00.000Z",
  "level": "info",
  "service": "bff-spa",
  "requestId": "uuid-v4",
  "message": "Request completed",
  "method": "GET",
  "path": "/api/items",
  "status": 200,
  "durationMs": 42
}
```
Cloud Logging indexa automáticamente estos campos para consultas y alertas.
