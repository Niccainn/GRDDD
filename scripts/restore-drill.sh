#!/usr/bin/env bash
#
# Grid — Postgres restore drill
#
# Backups are useless until you've actually restored one. This script
# automates the drill: pick the latest dump, restore it to a fresh
# scratch database, run a battery of sanity queries, and report.
#
# Run it weekly (or before any major schema change) to confirm:
#   • The dumps are well-formed and complete.
#   • pg_restore / psql round-trips don't drop data.
#   • Key tables have plausible row counts.
#   • The crypto / PII fields are still readable through the
#     application layer (caller sets DRILL_RUN_APP_PROBE=1 to enable).
#
# Required env:
#   DATABASE_URL              prod / source DATABASE_URL (read-only OK)
#   DRILL_DATABASE_URL        scratch DB to restore into (e.g.
#                             postgres://user:pw@localhost:5432/grid_drill)
#                             Must point at a DB you can DROP.
#
# Optional env:
#   BACKUP_DIR                where dumps live (default ./backups)
#   BACKUP_FILE               specific dump to restore (default: newest)
#
# Usage:
#   DATABASE_URL=...              \
#   DRILL_DATABASE_URL=...        \
#   ./scripts/restore-drill.sh
#
# Exit codes:
#   0  drill passed — backups are restorable
#   1  drill failed — investigate before relying on backups
#
# Safety:
#   - Read-only against DATABASE_URL. We only run COUNT(*) queries.
#   - DRILL_DATABASE_URL is wiped (DROP SCHEMA public) before restore.
#     Point it at a DB you can lose.

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set (source DB to compare against)}"
: "${DRILL_DATABASE_URL:?DRILL_DATABASE_URL must be set (scratch DB to restore into)}"

BACKUP_DIR="${BACKUP_DIR:-./backups}"

# ── Find the dump to restore ─────────────────────────────────────────
if [[ -n "${BACKUP_FILE:-}" ]]; then
  DUMP="$BACKUP_FILE"
else
  DUMP=$(ls -t "$BACKUP_DIR"/grid-*.sql.gz 2>/dev/null | head -n 1 || true)
fi

if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "✗ No backup file found in $BACKUP_DIR (or BACKUP_FILE invalid)."
  echo "  Run ./scripts/backup.sh first."
  exit 1
fi

DUMP_SIZE=$(du -h "$DUMP" | cut -f1)
echo "→ Restoring $DUMP ($DUMP_SIZE) into scratch DB..."

# ── Wipe + restore ───────────────────────────────────────────────────
psql "$DRILL_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
SQL

gunzip -c "$DUMP" | psql "$DRILL_DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null
echo "✓ Restore complete."

# ── Sanity battery ───────────────────────────────────────────────────
# Tables we care most about — auth, tenancy, audit. If any of these
# differ by more than the threshold the drill fails closed.
TABLES=(
  Identity
  Environment
  System
  Workflow
  AuditLog
  IntelligenceLog
  NovaMemory
  Integration
  Invite
  WaitlistEntry
)

echo
printf "%-22s %-12s %-12s %-12s %-8s\n" "Table" "Source" "Restored" "Diff" "Status"
printf "%-22s %-12s %-12s %-12s %-8s\n" "─────" "──────" "────────" "────" "──────"

FAIL=0
for t in "${TABLES[@]}"; do
  src=$(psql "$DATABASE_URL" -t -A -c "SELECT COUNT(*) FROM \"$t\";" 2>/dev/null || echo "ERR")
  dst=$(psql "$DRILL_DATABASE_URL" -t -A -c "SELECT COUNT(*) FROM \"$t\";" 2>/dev/null || echo "ERR")

  if [[ "$src" == "ERR" ]]; then
    printf "%-22s %-12s %-12s %-12s %-8s\n" "$t" "(missing)" "$dst" "—" "skip"
    continue
  fi
  if [[ "$dst" == "ERR" ]]; then
    printf "%-22s %-12s %-12s %-12s %-8s\n" "$t" "$src" "(missing)" "—" "FAIL"
    FAIL=$((FAIL + 1))
    continue
  fi

  diff=$((src - dst))
  abs_diff=${diff#-}

  # Rows added between the dump and now will show as a non-zero
  # diff — that's expected for live DBs. The threshold is 5% of
  # source rows, with a floor of 10 rows (small tables tolerate
  # more drift in absolute terms).
  threshold=$((src / 20))
  if [[ $threshold -lt 10 ]]; then threshold=10; fi

  if [[ $abs_diff -le $threshold ]]; then
    status="ok"
  else
    status="FAIL"
    FAIL=$((FAIL + 1))
  fi

  printf "%-22s %-12s %-12s %-12s %-8s\n" "$t" "$src" "$dst" "$diff" "$status"
done

# ── Application-layer probe (optional) ───────────────────────────────
# When set, also boot a tiny Node script against the restored DB to
# confirm Identity.email decrypts correctly through the Prisma PII
# extension. Catches "the dump is structurally complete but I forgot
# to back up the encryption key."
if [[ "${DRILL_RUN_APP_PROBE:-0}" == "1" ]]; then
  echo
  echo "→ Probing decryption via the app layer..."
  DATABASE_URL="$DRILL_DATABASE_URL" node -e '
    const { prisma } = require("./lib/db");
    prisma.identity.findFirst({ select: { email: true }})
      .then(r => {
        if (!r) { console.log("✓ No identities yet — probe skipped"); process.exit(0); }
        const ok = r.email && r.email.includes("@") && !r.email.startsWith("pii:");
        console.log(ok ? "✓ PII decryption working" : "✗ PII decryption FAILED — check GRID_ENCRYPTION_KEY");
        process.exit(ok ? 0 : 1);
      })
      .catch(e => { console.error("✗ Probe error:", e.message); process.exit(1); });
  ' || FAIL=$((FAIL + 1))
fi

echo
if [[ $FAIL -gt 0 ]]; then
  echo "✗ Drill FAILED — $FAIL check(s) outside tolerance."
  echo "  The latest backup may be stale or incomplete. Investigate before"
  echo "  trusting it as a recovery source."
  exit 1
fi

echo "✓ Drill passed — backup is restorable, row counts within tolerance."
echo "  Last drill timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
