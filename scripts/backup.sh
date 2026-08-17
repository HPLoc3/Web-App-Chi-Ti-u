#!/usr/bin/env bash
# ==============================================================================
# Sổ Tay Chi Tiêu - Automated PostgreSQL Backup Script
# Creates a compressed, timestamped backup of the production database
# ==============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS="${RETENTION_DAYS:-7}"

DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-hophuloc_expense_db}"

BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

mkdir -p "${BACKUP_DIR}"

echo "=========================================="
echo " Starting Database Backup: ${DB_NAME}"
echo " Timestamp: ${TIMESTAMP}"
echo " Host: ${DB_HOST}:${DB_PORT}"
echo " Destination: ${BACKUP_FILE}"
echo "=========================================="

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "❌ Error: pg_dump command not found. Please install postgresql-client." >&2
    exit 1
fi

# Execute pg_dump and pipe to gzip
export PGPASSWORD="${POSTGRES_PASSWORD:-}"
if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --format=plain \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --quote-all-identifiers | gzip -9 > "${BACKUP_FILE}"; then
    
    FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "✅ Backup completed successfully!"
    echo "📦 File Size: ${FILE_SIZE}"
    echo "📁 Path: ${BACKUP_FILE}"
else
    echo "❌ Backup failed!" >&2
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# Rotate old backups
echo "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "${DB_NAME}_backup_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete
echo "✨ Backup rotation complete."
