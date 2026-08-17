# ==============================================================================
# Multi-Stage Production Dockerfile for Sổ Tay Chi Tiêu (Expense Ledger)
# Node.js 20 Alpine + Vite SPA + Express Backend + Prisma ORM
# ==============================================================================

# --- Stage 1: Base Environment ---
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl dumb-init
WORKDIR /app

# --- Stage 2: Dependencies ---
FROM base AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --- Stage 3: Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build

# --- Stage 4: Production Runner ---
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl dumb-init curl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Tạo non-root user để tăng cường bảo mật container
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy artifacts đã build từ builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Gán quyền thư mục cho non-root user
USER nodejs

EXPOSE 3000

# Docker Native Health Check (Liveness Probe)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/health/live || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.cjs"]
