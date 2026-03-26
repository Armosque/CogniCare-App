# ============================================
# Dockerfile — 12-Factor: Build, Release, Run
# ============================================
# Etapa 1: Instalar dependencias
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Etapa 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Next.js standalone build
RUN npm run build

# Etapa 3: Release + Run (imagen mínima)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Usuario no-root (seguridad)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Copiar solo lo necesario del standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

EXPOSE 3000

# 12-Factor: Port binding — el orquestador inyecta PORT si es necesario
CMD ["node", "server.js"]
