# =============================================================================
# Stage 1: Build — compila la Angular SPA
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias primero (mejor uso de capa de cache)
COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts

# Copiar fuentes y compilar en modo producción
COPY . .
RUN npm run build:prod

# =============================================================================
# Stage 2: Runtime — nginx alpine, usuario no-root
# =============================================================================
FROM nginx:1.27-alpine AS runtime

# Instalar gettext para envsubst (sustitución de $PORT en nginx.conf)
RUN apk add --no-cache gettext

# Eliminar configuración por defecto de nginx
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copiar artefactos compilados de Angular
COPY --from=builder /app/dist/landing-spa/browser /usr/share/nginx/html

# Copiar plantilla de configuración runtime
COPY env-config.js.template /usr/share/nginx/html/env-config.js.template

# Copiar plantilla de configuración nginx
COPY nginx.conf /etc/nginx/nginx.conf.template

# Crear directorios necesarios con permisos para usuario no-root (nginx uid=101)
RUN mkdir -p /tmp /var/cache/nginx /var/log/nginx \
 && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /usr/share/nginx/html \
 && chmod -R 755 /usr/share/nginx/html

USER nginx

# Cloud Run inyecta $PORT en tiempo de ejecución (default 8080)
EXPOSE 8080

# Sustituir $PORT en la plantilla nginx y arrancar nginx
CMD ["/bin/sh", "-c", \
     "envsubst '${AUTH_TENANT} ${AUTH_CLIENT_ID} ${AUTH_AUTHORITY} ${AUTH_REDIRECT_URI} ${AUTH_SCOPES} ${BFF_URL} ${DEMO_APP_URL}' \
       < /usr/share/nginx/html/env-config.js.template \
       > /usr/share/nginx/html/env-config.js \
     && envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /tmp/nginx.conf \
     && nginx -c /tmp/nginx.conf -g 'daemon off;'"]
