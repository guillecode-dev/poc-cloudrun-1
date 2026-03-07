# landing-spa

SPA pública Angular 17+ con autenticación Azure Entra ID (PKCE) para la PoC de arquitectura en GCP Cloud Run.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Angular 17+ (standalone components) |
| Auth | `@azure/msal-angular` v3 + `@azure/msal-browser` v3 |
| Build | Angular CLI + `@angular-devkit/build-angular` |
| Runtime | nginx:1.27-alpine (multi-stage Docker) |
| Plataforma | GCP Cloud Run |

---

## Variables de entorno requeridas

> En **desarrollo** se configuran en `src/environments/environment.ts`.
> En **producción** se inyectan en runtime via `window.__env` (archivo `env-config.js` generado por Cloud Build o el entrypoint del contenedor).

| Variable | Descripción | Ejemplo |
|---|---|---|
| `AUTH_TENANT` | Tenant ID de Azure Entra ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `AUTH_CLIENT_ID` | Client ID de la aplicación registrada en Entra ID | `yyyyyyyy-...` |
| `AUTH_AUTHORITY` | URL de autoridad OIDC | `https://login.microsoftonline.com/<TENANT_ID>` |
| `AUTH_REDIRECT_URI` | URI de redirección registrada en Entra ID | `https://landing.example.com` |
| `AUTH_SCOPES` | Scopes separados por coma | `openid,profile,email,api://CLIENT_ID/access_as_user` |
| `BFF_URL` | URL base del BFF (sin `/api`) | `https://bff.example.com` |
| `DEMO_APP_URL` | URL de la Demo App SPA | `https://app-demo.example.com` |

---

## Desarrollo local

### 1. Prerequisitos

- Node.js 20 LTS
- npm 10+
- Angular CLI: `npm install -g @angular/cli`

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables locales

Editar `src/environments/environment.ts` con los valores reales del tenant de desarrollo:

```typescript
export const environment = {
  production: false,
  authTenant: 'TU_TENANT_ID',
  authClientId: 'TU_CLIENT_ID',
  authAuthority: 'https://login.microsoftonline.com/TU_TENANT_ID',
  authRedirectUri: 'http://localhost:4200',
  authScopes: ['openid', 'profile', 'email', 'api://TU_API_ID/access_as_user'],
  bffUrl: 'http://localhost:3000',
  demoAppUrl: 'http://localhost:4300',
};
```

> **Importante:** Registrar `http://localhost:4200` como URI de redirección en el registro de aplicación de Entra ID.

### 4. Iniciar servidor de desarrollo

```bash
ng serve
# Acceder en http://localhost:4200
```

---

## Build de producción

```bash
npm run build:prod
# Artefactos en: dist/landing-spa/browser/
```

---

## Docker (Cloud Run)

### Build local

```bash
docker build -t landing-spa:local .
```

### Run local simulando Cloud Run

```bash
docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  landing-spa:local
```

### Variables en producción (runtime injection)

El contenedor usa `envsubst` para resolver `${PORT}` en la configuración de nginx.
Las variables de la aplicación Angular se deben inyectar generando `/usr/share/nginx/html/env-config.js` con el siguiente formato:

```javascript
window.__env = {
  AUTH_TENANT: "...",
  AUTH_CLIENT_ID: "...",
  AUTH_AUTHORITY: "...",
  AUTH_REDIRECT_URI: "...",
  AUTH_SCOPES: "openid,profile,email,api://CLIENT_ID/access_as_user",
  BFF_URL: "https://bff.example.com",
  DEMO_APP_URL: "https://app-demo.example.com"
};
```

Incluir el script en `index.html` **antes** del bundle de Angular:

```html
<script src="/env-config.js"></script>
```

---

## Estructura del proyecto

```
landing-spa/
├── src/
│   ├── app/
│   │   ├── app.component.ts        # Shell: header fijo + router-outlet
│   │   ├── app.config.ts           # ApplicationConfig: MSAL, router, HTTP
│   │   ├── app.routes.ts           # Rutas: / y /profile (MsalGuard)
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts # HttpInterceptorFn — Bearer token en /api/*
│   │   └── pages/
│   │       ├── home/               # Página pública con botón Login
│   │       └── profile/            # Claims del ID Token (protegida)
│   ├── environments/
│   │   ├── environment.ts          # Desarrollo
│   │   └── environment.prod.ts     # Producción (lee window.__env)
│   ├── index.html
│   ├── main.ts
│   └── styles.css
├── Dockerfile                      # Multi-stage: ng build + nginx:alpine
├── nginx.conf                      # Plantilla nginx (${PORT} via envsubst)
├── angular.json
├── package.json
└── tsconfig.json
```

---

## Seguridad

- Los tokens **nunca** se persisten en `localStorage`. MSAL usa `sessionStorage` solo para el estado OAuth (code_verifier, state) durante el flujo PKCE, no para los tokens de acceso que viven en memoria.
- El interceptor `authInterceptor` solo adjunta tokens a rutas que comiencen con `${bffUrl}/api/`.
- El BFF valida el JWT vía JWKS independientemente del interceptor.
- nginx aplica cabeceras de seguridad: `X-Frame-Options`, `X-Content-Type-Options`, `CSP`, `Referrer-Policy`.
