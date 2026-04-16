#!/usr/bin/env node
/**
 * Build-time migration script:
 * 1. Push schema changes (with --accept-data-loss for the emailHash unique constraint)
 * 2. Backfill emailHash for any Identity rows that have plaintext email but no hash
 *
 * This runs as part of the Vercel build command. Once all rows are backfilled,
 * subsequent deploys can switch back to plain `prisma db push --skip-generate`.
 */
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { createHmac } from 'crypto';
import { hkdfSync } from 'crypto';

// --- Step 1: Push schema ---
console.log('[migrate] Pushing schema changes...');
execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
console.log('[migrate] Schema pushed successfully.');

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
