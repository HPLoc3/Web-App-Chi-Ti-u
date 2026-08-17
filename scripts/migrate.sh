#!/usr/bin/env bash
# ==============================================================================
# Sổ Tay Chi Tiêu - Zero-Downtime Database Migration Runner
# Executes pending Prisma migrations against PostgreSQL with safety checks
# ==============================================================================

set -euo pipefail

echo "=========================================="
echo " 🚀 Running Production Database Migrations"
echo " Environment: ${NODE_ENV:-production}"
echo "=========================================="

# 1. Generate Prisma Client
echo "1️⃣ Generating Prisma Client..."
npx prisma generate

# 2. Check pending migrations status
echo "2️⃣ Checking migration status..."
npx prisma migrate status || true

# 3. Apply pending migrations
echo "3️⃣ Deploying pending migrations..."
if npx prisma migrate deploy; then
    echo "=========================================="
    echo "✅ Database migrations applied successfully!"
    echo "=========================================="
else
    echo "❌ Database migration failed! Inspect output above." >&2
    exit 1
fi
