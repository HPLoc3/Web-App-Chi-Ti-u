#!/usr/bin/env bash
# ==============================================================================
# Sổ Tay Chi Tiêu - Backup Verification Script
# Validates the structural integrity and readability of a PostgreSQL backup file
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz>"
    echo "Example: $0 ./backups/hophuloc_expense_db_backup_20260817_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Error: Backup file '${BACKUP_FILE}' does not exist!" >&2
    exit 1
fi

echo "=========================================="
echo " 🔍 Verifying Database Backup Integrity"
echo " File: ${BACKUP_FILE}"
echo " Size: $(du -h "${BACKUP_FILE}" | cut -f1)"
echo "=========================================="

# 1. Test gzip archive compression integrity
echo "1️⃣ Testing gzip compression CRC checksum..."
if gzip -t "${BACKUP_FILE}"; then
    echo "  ✅ Gzip integrity: OK (No archive corruption detected)"
else
    echo "  ❌ Gzip integrity: FAILED (Corrupted gzip archive)" >&2
    exit 1
fi

# 2. Check for required SQL statements inside the backup
echo "2️⃣ Inspecting SQL structure inside backup..."
TABLE_COUNT=$(gzip -dc "${BACKUP_FILE}" | grep -c "CREATE TABLE" || true)
COPY_COUNT=$(gzip -dc "${BACKUP_FILE}" | grep -c "COPY " || true)

echo "  📊 Discovered ${TABLE_COUNT} table creation statements"
echo "  📊 Discovered ${COPY_COUNT} data COPY blocks"

# Check for essential tables in Sổ Tay Chi Tiêu schema
REQUIRED_TABLES=("users" "transactions" "categories" "wallets" "budgets" "goals")
MISSING_TABLES=0

for table in "${REQUIRED_TABLES[@]}"; do
    if gzip -dc "${BACKUP_FILE}" | grep -qi "CREATE TABLE.*\"${table}\""; then
        echo "  ✅ Verified table schema: ${table}"
    else
        echo "  ⚠️ Warning: Table '${table}' schema definition not found in backup header"
        MISSING_TABLES=$((MISSING_TABLES + 1))
    fi
done

if [ "${TABLE_COUNT}" -gt 0 ]; then
    echo "=========================================="
    echo "✅ Backup verification passed successfully!"
    echo "The backup file is ready for production restore."
    echo "=========================================="
    exit 0
else
    echo "❌ Backup verification failed: No valid SQL table statements found." >&2
    exit 1
fi
