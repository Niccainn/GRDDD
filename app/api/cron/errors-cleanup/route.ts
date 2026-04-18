import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Daily cleanup — drop AppError rows older than the retention window.
 *
 * GDPR Article 5(1)(e) — storage limitation: personal data kept no
 * longer than necessary. AppError rows sometimes carry tenant-scoped
 * identifiers (environmentId, identityId) alongside stack traces,
 * which is technically PII. 30-day retention keeps ops usable
 * (debug a bug from last week) while respecting the principle.
 *
 * Override via GRID_ERROR_RETENTION_DAYS env var. Minimum 7 days —
 * anything shorter defeats the point of having logs.
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.GRID_CRON_TOKEN;
  if (!secret) {
    return Response.json({ error: 'Cron disabled (GRID_CRON_TOKEN unset)' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (bearer !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawDays = Number(process.env.GRID_ERROR_RETENTION_DAYS);
  const retentionDays = Number.isFinite(rawDays) && rawDays >= 7 ? Math.floor(rawDays) : 30;
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);

  const result = await prisma.appError.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return Response.json({
    ok: true,
    deleted: result.count,
    retentionDays,
    cutoff: cutoff.toISOString(),
  });
}
