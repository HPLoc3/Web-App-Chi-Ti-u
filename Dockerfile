# ==============================================================================
# Multi-Stage Production Dockerfile for Sổ Tay Chi Tiêu (Expense Ledger)
# Node.js 20 Alpine + Vite SPA + Express Backend + Prisma ORM
# Optimized for: Security (Non-Root), Speed (Layer Caching), Minimal Footprint
# ==============================================================================

# --- Stage 1: Base Environment ---
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl dumb-init curl
WORKDIR /app

# --- Stage 2: Full Dependencies (For Building) ---
FROM base AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --- Stage 3: Production-Only Dependencies (For Runner) ---
FROM base AS prod-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

# --- Stage 4: Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build

# --- Stage 5: Production Runner ---
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl dumb-init curl
WORKDIR /app

ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}
ENV NODE_ENV=production
ENV PORT=3000

# Tạo non-root system group & user để tăng cường bảo mật container
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 -G nodejs nodejs

# Copy duy nhất các artifacts cần thiết cho production runtime
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=prod-dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Chuyển quyền thực thi sang non-root user
USER nodejs

EXPOSE 3000

# Native Docker Health Check (Liveness Probe)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/health/live || exit 1

# dumb-init xử lý chuẩn tín hiệu POSIX (SIGTERM / SIGINT) phục vụ Graceful Shutdown
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.cjs"]
