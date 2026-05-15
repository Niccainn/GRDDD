---
name: restore-drill
description: Use this skill quarterly, before any risky DB migration, or when asked "are our backups sound". Runs the existing restore-drill script against a fresh target, verifies row counts and schema parity, and confirms the restored DB could actually serve traffic.
---

# Skill: restore-drill

## When to invoke

- Quarterly cadence (calendar reminder)
- Before any `prisma migrate` that alters production tables (esp. the Nova→Atrium DB migration in `docs/NOVA-PURGE-SCOPE.md`)
- "Are our backups sound?" / "Can we recover if Neon goes down?"
- After changing the backup configuration

## Procedure

```bash
cd /Users/nc/projects/grid

# 1. Confirm the drill script exists + is current
cat scripts/restore-drill.sh | head -30

# 2. Run it (it provisions a throwaway target, restores latest backup)
bash scripts/restore-drill.sh 2>&1 | tee /tmp/_drill.log

# 3. Verify row counts on key tables match production (within tolerance)
#    The script should print these; if not, connect to the restored DB and:
#    SELECT
#      (SELECT count(*) FROM "Identity")      AS identities,
#      (SELECT count(*) FROM "Environment")   AS environments,
#      (SELECT count(*) FROM "Subscription")  AS subscriptions,
#      (SELECT count(*) FROM "AuditLog")      AS audit_rows;

# 4. Schema parity check — restored schema must match current prod
#    npx prisma migrate diff \
#      --from-url "$RESTORED_DATABASE_URL" \
#      --to-url   "$PRODUCTION_DATABASE_URL" \
#      --exit-code
#    Exit 0 = identical. Exit 2 = drift (investigate).

# 5. Smoke: can the restored DB actually run the app?
#    Point a local dev server at $RESTORED_DATABASE_URL, hit /api/health/ready

# 6. Tear down the throwaway target (script should do this; verify no orphan)
```

## Verification

- Restore completes in < 10 minutes
- Row counts on Identity / Environment / Subscription / AuditLog are within expected delta of prod (accounting for time between backup + drill)
- `prisma migrate diff` between restored and prod exits 0 (no schema drift)
- `/api/health/ready` returns 200 against the restored DB
- Throwaway target torn down (no cost leak)

## Failure modes

- **Backup is from a stale schema** — if prod has migrated since the last backup, restore + current code mismatch. The `migrate diff` step catches this; the fix is a more frequent backup cadence or point-in-time recovery.
- **Restore env missing env vars** — the restored DB can't actually serve unless `GRID_ENCRYPTION_KEY` (and others) match the originals; encrypted columns (`anthropicKeyEnc`) won't decrypt with a different key. Restore drill must use the SAME encryption key.
- **Neon branch vs snapshot** — Neon's branching is near-instant but a "branch" shares storage; a true DR test needs a real export/import, not a branch. Confirm the script does a real restore.
- **Orphan target left running** — costs money. Always verify teardown; grep `vercel`/`neon` resource lists after.
- **Drill runs against prod by accident** — the script must NEVER point writes at the production `DATABASE_URL`. Read the script's target-selection logic before running.

## Owner

`operator`
