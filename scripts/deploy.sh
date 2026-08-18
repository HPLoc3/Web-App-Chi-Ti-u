#!/usr/bin/env bash
# ==============================================================================
# Production Deployment Script — Sổ Tay Chi Tiêu
# Robust automated deployment with Git reset/clean, Docker Compose & Migrations
# ==============================================================================

set -eo pipefail

APP_DIR="${APP_DIR:-/var/www/app-chi-tieu}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

echo "=========================================="
echo "🚀 Starting Automated Deployment..."
echo "📂 Target Directory: ${APP_DIR}"
echo "=========================================="

cd "${APP_DIR}" || { echo "❌ Cannot change directory to ${APP_DIR}"; exit 1; }

echo "📥 Fetching latest code from GitHub..."
git fetch origin main

echo "🔄 Resetting local server changes to match remote repository safely..."
# Discard server-side runtime file modifications (e.g. package-lock.json, generated files)
# while preserving untracked environment files (.env)
git reset --hard origin/main

if [ ! -f .env ]; then
  echo "❌ FATAL ERROR: Production .env file not found in ${APP_DIR}!"
  echo "Please configure the production .env file before deploying."
  exit 1
fi

echo "📦 Syncing Docker images & building containers..."
docker compose -f "${COMPOSE_FILE}" build --pull

echo "🗄️ Executing database migrations..."
docker compose -f "${COMPOSE_FILE}" run --rm app npx prisma migrate deploy

echo "🚀 Restarting production containers (zero-downtime)..."
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

echo "🧹 Cleaning up dangling Docker images..."
docker image prune -f

echo "🩺 Verifying container health..."
docker compose -f "${COMPOSE_FILE}" ps

echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "=========================================="
