# app-demo-spa

SPA de demostración Angular 17+ con Angular Material, menú Artículos/Órdenes y autenticación Azure Entra ID (PKCE) sobre GCP Cloud Run.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Angular 17+ (standalone components) |
| UI | Angular Material 17 (tema azure-blue) |
| Auth | `@azure/msal-angular` v3 + `@azure/msal-browser` v3 |
| Forms | Angular Reactive Forms |
| Build | Angular CLI + `@angular-devkit/build-angular` |
| Runtime | nginx:1.27-alpine (multi-stage Docker) |
| Plataforma | GCP Cloud Run |

---

## Variables de entorno requeridas

> En **desarrollo** se configuran en `src/environments/environment.ts`.
> En **producción** se inyectan en runtime via `window.__env` (archivo `env-config.js`).

| Variable | Descripción | Ejemplo dev |
|---|---|---|
| `AUTH_TENANT` | Tenant ID de Azure Entra ID | `xxxxxxxx-...` |
| `AUTH_CLIENT_ID` | Client ID de la app registrada | `yyyyyyyy-...` |
| `AUTH_AUTHORITY` | URL de autoridad OIDC | `https://login.microsoftonline.com/<TENANT>` |
| `AUTH_REDIRECT_URI` | URI de redirección registrada | `http://localhost:4300` |
| `AUTH_SCOPES` | Scopes separados por coma | `openid,profile,email,api://ID/access_as_user` |
| `BFF_URL` | URL base del BFF (sin `/api`) | `http://localhost:3000` |
| `LANDING_URL` | URL de la Landing SPA | `http://localhost:4200` |

---

## Desarrollo local

### 1. Prerequisitos

- Node.js 20 LTS
- Angular CLI: `npm install -g @angular/cli`

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables locales

Editar `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  authTenant: 'TU_TENANT_ID',
  authClientId: 'TU_CLIENT_ID',
  authAuthority: 'https://login.microsoftonline.com/TU_TENANT_ID',
  authRedirectUri: 'http://localhost:4300',
  authScopes: ['openid', 'profile', 'email', 'api://TU_API_ID/access_as_user'],
  bffUrl: 'http://localhost:3000',
  landingUrl: 'http://localhost:4200',
};
```

> Registrar `http://localhost:4300` como URI de redirección en el registro de la app en Entra ID.

### 4. Iniciar servidor de desarrollo

```bash
ng serve --port 4300
# Acceder en http://localhost:4300
```

---

## Build de producción

```bash
npm run build:prod
# Artefactos en: dist/app-demo-spa/browser/
```

---

## Docker (Cloud Run)

### Build local

```bash
docker build -t app-demo-spa:local .
```

### Run local simulando Cloud Run

```bash
docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  app-demo-spa:local
```

### Variables en producción (runtime injection)

Generar `/usr/share/nginx/html/env-config.js` antes de servir:

```javascript
window.__env = {
  AUTH_TENANT: "...",
  AUTH_CLIENT_ID: "...",
  AUTH_AUTHORITY: "...",
  AUTH_REDIRECT_URI: "https://app-demo.example.com",
  AUTH_SCOPES: "openid,profile,email,api://CLIENT_ID/access_as_user",
  BFF_URL: "https://bff.example.com",
  LANDING_URL: "https://landing.example.com"
};
```

Incluir en `index.html` antes del bundle:

```html
<script src="/env-config.js"></script>
```

---

## Arquitectura y flujo

```
Usuario  →  app-demo-spa (SPA)
               │
               ├─ APP_INITIALIZER
               │    ├─ MSAL.handleRedirectPromise()   ← procesa código PKCE
               │    └─ POST /session/handshake        ← notifica al BFF
               │
               ├─ /items  [MsalGuard] → GET /api/items
               └─ /orders [MsalGuard] → GET /api/orders / POST /api/orders
```

### MsalRedirectComponent

La ruta raíz `/` está asignada a `MsalRedirectComponent`. Esto garantiza que el código de autorización OAuth devuelto por Entra ID sea procesado correctamente sin interrumpir la navegación.

### Rutas protegidas

Tanto `/items` como `/orders` están protegidas con `MsalGuard`. Si el usuario no está autenticado, MSAL inicia el flujo PKCE con redirect automático.

### APP_INITIALIZER

Al arrancar la app (antes de renderizar cualquier componente):
1. Se invoca `handleRedirectPromise()` para procesar la respuesta del IdP.
2. Si hay sesión activa, se llama `POST /session/handshake` al BFF. El BFF crea o renueva la sesión en Firestore. Si el handshake falla, la app continúa con degradación elegante.

---

## Estructura del proyecto

```
app-demo-spa/
├── src/
│   ├── app/
│   │   ├── app.component.ts/html/css      # Shell: header + router-outlet
│   │   ├── app.config.ts                  # ApplicationConfig + APP_INITIALIZER
│   │   ├── app.routes.ts                  # /, /items, /orders
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts        # Bearer token en /api/* y /session/*
│   │   ├── models/
│   │   │   ├── item.model.ts
│   │   │   └── order.model.ts
│   │   ├── pages/
│   │   │   ├── items/items.component.ts   # Tabla Material con paginación/sort
│   │   │   └── orders/orders.component.ts # Tabla + Reactive Form
│   │   └── services/
│   │       ├── items.service.ts
│   │       ├── orders.service.ts
│   │       └── session.service.ts
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── index.html
│   ├── main.ts
│   └── styles.css
├── Dockerfile
├── nginx.conf
├── angular.json
├── package.json
└── tsconfig.json
```

---

## Seguridad

- Los tokens de acceso viven en **memoria** JS (no se persisten entre sesiones).
- `authInterceptor` adjunta Bearer solo a rutas `${bffUrl}/api/*` y `${bffUrl}/session/*`.
- nginx aplica cabeceras: `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `CSP`, `Referrer-Policy`.
- Dockerfile: build multi-stage + usuario no-root (`nginx` uid=101).
