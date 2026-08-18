#!/usr/bin/env bash
# ==============================================================================
# Sổ Tay Chi Tiêu - Zero-Downtime Database Migration Runner
# Executes pending Prisma migrations against PostgreSQL with strict fail-fast
# ==============================================================================

set -euo pipefail

echo "=========================================="
echo " 🚀 Running Production Database Migrations"
echo " Environment: ${NODE_ENV:-production}"
echo " Target Engine: PostgreSQL (postgres:5432)"
echo "=========================================="

# 1. Generate Prisma Client
echo "1️⃣ Generating Prisma Client..."
npx prisma generate

# 2. Deploy pending migrations
echo "2️⃣ Deploying pending migrations via 'prisma migrate deploy'..."
npx prisma migrate deploy

echo "=========================================="
echo "✅ Database migrations applied successfully!"
echo "=========================================="
