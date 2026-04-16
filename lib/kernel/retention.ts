/**
 * Kernel retention — enforce the data-retention promise from /privacy.
 *
 * The privacy policy commits to:
 *   - KernelTrace rows deleted after 30 days
 *   - Audit log retained 12 months
 *
 * This file is the enforcement code. It is called from the cron tick
 * so every 1-minute cron invocation gets a chance to sweep expired
 * rows. Deletion is batched (max 500 per run) so a very large backlog
 * can't lock the table for minutes; next tick picks up the remainder.
 */

import { prisma } from '../db';

export const TRACE_RETENTION_DAYS = 30;
const BATCH_LIMIT = 500;

export interface RetentionReport {
  scanned: number;
  deleted: number;
  cutoff: string;
  portalLinksDeactivated?: number;
}

/**
 * Delete kernel traces older than TRACE_RETENTION_DAYS.
 * Returns the count deleted and the cutoff used.
 */
export async function sweepExpiredTraces(): Promise<RetentionReport> {
  const cutoff = new Date(Date.now() - TRACE_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  // Find up to BATCH_LIMIT expired trace IDs in one query, then delete
  // by ID set so we can return a precise count and so the delete
  // predicate stays simple.
  const expired = await prisma.kernelTrace.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true },
    take: BATCH_LIMIT,
  });

  if (expired.length === 0) {
    return { scanned: 0, deleted: 0, cutoff: cutoff.toISOString() };
  }

  const result = await prisma.kernelTrace.deleteMany({
    where: { id: { in: expired.map((e) => e.id) } },
  });

  // Also sweep expired portal links — deactivate links past their expiresAt.
  // Does not hard-delete (has deletedAt for audit), just marks inactive.
  let portalLinksDeactivated = 0;
  try {
    const expiredLinks = await prisma.portalLink.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      data: { isActive: false },
    });
    portalLinksDeactivated = expiredLinks.count;
  } catch {
    // best-effort — don't block trace retention
  }

  return {
    scanned: expired.length,
    deleted: result.count,
    cutoff: cutoff.toISOString(),
    portalLinksDeactivated,
  };
}
