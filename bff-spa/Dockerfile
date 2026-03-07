# =============================================================================
# Stage 1: Build — compila TypeScript a JavaScript
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias (incluye devDeps para tsc)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copiar fuentes y compilar
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# =============================================================================
# Stage 2: Runtime — solo dependencias de producción, usuario node no-root
# =============================================================================
FROM node:20-alpine AS runtime

# Metadatos
LABEL org.opencontainers.image.title="bff-spa" \
      org.opencontainers.image.description="Backend For Frontend — Corp PoC Cloud Run"

WORKDIR /app

# Instalar solo deps de producción
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts \
 && npm cache clean --force

# Copiar artefactos compilados
COPY --from=builder /app/dist ./dist

# Usuario no-root (node uid=1000 en node:alpine)
USER node

# Cloud Run inyecta $PORT (default 8080); la app lo lee de process.env.PORT
EXPOSE 8080

CMD ["node", "dist/index.js"]
