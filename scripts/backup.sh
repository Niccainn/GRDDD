#!/usr/bin/env bash
#
# Grid — Postgres backup script
#
# Dumps the production database to a gzipped SQL file, timestamped and
# retained for 30 days. Designed to run as a cron job on any box with
# pg_dump 15+ installed, or as a GitHub Actions scheduled workflow
# (see .github/workflows/backup.yml — create that if you want cloud-
# hosted backups without provisioning a box).
#
# Required env:
#   DATABASE_URL       full Postgres URL (same one the app uses)
#   BACKUP_DIR         where to drop dumps (default ./backups)
#   BACKUP_RETENTION_DAYS  how long to keep old dumps (default 30)
#
# Optional env:
#   BACKUP_UPLOAD_CMD  shell command to upload the dump. Receives the
#                      dump path as $1. Example:
#                        BACKUP_UPLOAD_CMD='rclone copy "$1" s3:grid-backups/'
#
# Usage:
#   ./scripts/backup.sh
#
# Restore:
#   gunzip -c backups/grid-YYYYMMDD-HHMMSS.sql.gz | psql "$DATABASE_URL"

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

timestamp=$(date -u +%Y%m%d-%H%M%S)
dump_path="$BACKUP_DIR/grid-$timestamp.sql.gz"

echo "[backup] dumping to $dump_path"

# --no-owner / --no-privileges strip role-specific grants so the dump
# restores cleanly into a fresh database with a different role name.
# --clean --if-exists makes the dump idempotent on restore.
pg_dump \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  "$DATABASE_URL" \
  | gzip -9 > "$dump_path"

size=$(du -h "$dump_path" | cut -f1)
echo "[backup] wrote $size to $dump_path"

# Optional remote upload
if [ -n "${BACKUP_UPLOAD_CMD:-}" ]; then
  echo "[backup] uploading via BACKUP_UPLOAD_CMD"
  eval "$BACKUP_UPLOAD_CMD \"$dump_path\""
fi

# Retention sweep — delete dumps older than BACKUP_RETENTION_DAYS.
echo "[backup] pruning dumps older than $BACKUP_RETENTION_DAYS days"
find "$BACKUP_DIR" -name 'grid-*.sql.gz' -type f -mtime "+$BACKUP_RETENTION_DAYS" -print -delete || true

echo "[backup] done"
