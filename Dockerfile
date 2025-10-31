# Dockerfile optimizado para Next.js 15 en Railway con pnpm
# Multi-stage build para reducir el tamaño de la imagen

# Etapa 1: Instalación de dependencias
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl

# Instalar pnpm globalmente
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar archivos de configuración de pnpm
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias de producción
RUN pnpm install --prod --frozen-lockfile

# Etapa 2: Build de la aplicación
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar archivos de pnpm
COPY package.json pnpm-lock.yaml ./

# Instalar todas las dependencias (incluyendo dev) para el build
RUN pnpm install --frozen-lockfile

# Copiar el resto del código
COPY . .

# Argumentos de build para variables de entorno de Supabase
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY

# Variables de entorno necesarias para el build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV RAILWAY_ENVIRONMENT=true
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY

# Build de Next.js
RUN pnpm run build

# Etapa 3: Imagen de producción
FROM node:22-alpine AS runner

# Instalar pnpm en runner
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos públicos
COPY --from=builder /app/public ./public

# Copiar archivos de build de Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Cambiar a usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno de producción
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV RAILWAY_ENVIRONMENT=true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "server.js"]
