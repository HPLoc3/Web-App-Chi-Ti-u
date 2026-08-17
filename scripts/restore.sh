#!/usr/bin/env bash
# ==============================================================================
# Sổ Tay Chi Tiêu - PostgreSQL Safe Restore Procedure
# Restores a compressed backup archive to the PostgreSQL database
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz> [--force]"
    echo "Example: $0 ./backups/hophuloc_expense_db_backup_20260817_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"
FORCE="${2:-}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Error: Backup file '${BACKUP_FILE}' not found!" >&2
    exit 1
fi

DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-hophuloc_expense_db}"

echo "========================================================"
echo " ⚠️  CRITICAL: DATABASE RESTORE PROCEDURE"
echo " Target Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}"
echo " Source File:     ${BACKUP_FILE}"
echo "========================================================"

if [ "${FORCE}" != "--force" ]; then
    echo "⚠️  WARNING: Restoring will overwrite existing data in '${DB_NAME}'!"
    read -rp "Are you absolutely sure you want to proceed? (Type 'CONFIRM' to continue): " CONFIRMATION
    if [ "${CONFIRMATION}" != "CONFIRM" ]; then
        echo "❌ Restore aborted by user."
        exit 0
    fi
fi

# Step 1: Pre-flight verify backup integrity
echo "1️⃣ Pre-flight: Verifying backup archive integrity..."
if ! gzip -t "${BACKUP_FILE}"; then
    echo "❌ Error: Corrupted backup archive. Restore cancelled." >&2
    exit 1
fi
echo "  ✅ Backup archive is valid."

# Step 2: Check database connectivity
echo "2️⃣ Checking PostgreSQL connection..."
export PGPASSWORD="${POSTGRES_PASSWORD:-}"
if ! psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Error: Cannot connect to PostgreSQL database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}" >&2
    exit 1
fi
echo "  ✅ Database connection established."

# Step 3: Execute Restore
echo "3️⃣ Executing restore stream to PostgreSQL..."
if gzip -dc "${BACKUP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" --single-transaction --set ON_ERROR_STOP=on; then
    echo "========================================================"
    echo "✅ Database restore completed successfully!"
    echo "Target '${DB_NAME}' has been restored to state from backup."
    echo "========================================================"
else
    echo "❌ Restore failed! Check PostgreSQL logs for details." >&2
    exit 1
fi
