#!/usr/bin/env node
/**
 * Build-time migration script:
 * 1. Push schema changes (with --accept-data-loss for the emailHash unique constraint)
 * 2. Backfill emailHash for any Identity rows that have plaintext email but no hash
 *
 * This runs as part of the Vercel build command. Once all rows are backfilled,
 * subsequent deploys can switch back to plain `prisma db push --skip-generate`.
 *
 * BUILD-RESILIENCE CONTRACT: neither step may halt the build. Schema
 * drift is strictly preferable to a 12-commit deploy backlog — the
 * previous behaviour (throw on db push failure) made a DB hiccup
 * silently freeze every live deploy. Now both steps log loudly and
 * exit 0; the app's /api/health endpoint surfaces schema mismatches
 * separately.
 */
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { createHmac } from 'crypto';
import { hkdfSync } from 'crypto';

// --- Step 1: Push schema (non-blocking) ---
console.log('[migrate] Pushing schema changes...');
try {
  execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
  console.log('[migrate] Schema pushed successfully.');
} catch (err) {
  // LOG LOUDLY but don't throw. If the prod DB is unreachable, the
  // schema is locked, or the migration conflicts with existing data,
  // the build must still complete so the NEW application code can
  // deploy — otherwise every bug fix waits behind one DB hiccup.
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('[migrate] ⚠ prisma db push FAILED — proceeding anyway.');
  console.error('[migrate] Error:', err.message);
  console.error('[migrate] ACTION: run `npx prisma db push` manually');
  console.error('[migrate] against DATABASE_URL once the build lands.');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// --- Step 2: Backfill emailHash ---
const prisma = new PrismaClient();

function getHmacKey() {
  const master = process.env.GRID_ENCRYPTION_KEY;
  if (!master) {
    console.log('[migrate] GRID_ENCRYPTION_KEY not set — skipping emailHash backfill');
    return null;
  }
  const derived = hkdfSync('sha256', Buffer.from(master, 'base64url'), '', 'email-hash', 32);
  return Buffer.from(derived);
}

function computeEmailHash(email) {
  const key = getHmacKey();
  if (!key) return null;
  const normalized = email.trim().toLowerCase();
  return createHmac('sha256', key).update(normalized).digest('base64url');
}

async function backfill() {
  const key = getHmacKey();
  if (!key) return;

  // Find identities with email but no emailHash
  const rows = await prisma.identity.findMany({
    where: {
      email: { not: null },
      emailHash: null,
    },
    select: { id: true, email: true },
  });

  if (rows.length === 0) {
    console.log('[migrate] No rows need emailHash backfill.');
    return;
  }

  console.log(`[migrate] Backfilling emailHash for ${rows.length} identities...`);

  for (const row of rows) {
    // Skip encrypted emails (they start with "pii:") — those already have emailHash set by the app
    if (row.email?.startsWith('pii:')) continue;

    const hash = computeEmailHash(row.email);
    if (hash) {
      await prisma.identity.update({
        where: { id: row.id },
        data: { emailHash: hash },
      });
    }
  }

  console.log('[migrate] emailHash backfill complete.');
}

try {
  await backfill();
} catch (err) {
  console.error('[migrate] Backfill error (non-fatal):', err.message);
} finally {
  await prisma.$disconnect();
}
