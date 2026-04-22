/**
 * GET /api/audit/export
 *
 * One-click CSV of the caller's AuditLog entries. Closes dozens of
 * procurement objections in 30 minutes of work — enterprises want to
 * know they can walk out with their audit trail whenever they need
 * it.
 *
 * Query params:
 *   - environmentId? — scope to one Environment (default: all the
 *     caller can see).
 *   - days? — window in days (default 90, cap 365).
 *   - format? — 'csv' (default) or 'jsonl'.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

const MAX_ROWS = 10_000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  // Wrap any value that contains a comma, quote, or newline.
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const envId = req.nextUrl.searchParams.get('environmentId');
  const daysRaw = parseInt(req.nextUrl.searchParams.get('days') ?? '90', 10);
  const days = Math.min(Math.max(Number.isFinite(daysRaw) ? daysRaw : 90, 1), 365);
  const format = req.nextUrl.searchParams.get('format') === 'jsonl' ? 'jsonl' : 'csv';

  // Restrict to environments the caller actually owns or belongs to.
  const myEnvs = await prisma.environment.findMany({
    where: {
      deletedAt: null,
      OR: [{ ownerId: identity.id }, { memberships: { some: { identityId: identity.id } } }],
    },
    select: { id: true },
  });
  const allowedIds = myEnvs.map(e => e.id);
  if (allowedIds.length === 0) {
    return new Response('', { status: 200 });
  }
  const targetIds = envId && allowedIds.includes(envId) ? [envId] : allowedIds;

  const since = new Date(Date.now() - days * MS_PER_DAY);
  const rows = await prisma.auditLog.findMany({
    where: { environmentId: { in: targetIds }, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: MAX_ROWS,
    select: {
      id: true,
      createdAt: true,
      action: true,
      actorId: true,
      environmentId: true,
      entity: true,
      entityId: true,
      entityName: true,
      metadata: true,
    },
  });

  const filename = `grid-audit-${new Date().toISOString().slice(0, 10)}.${format}`;
  const headers = new Headers();
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);

  if (format === 'jsonl') {
    headers.set('Content-Type', 'application/x-ndjson; charset=utf-8');
    const body = rows.map(r => JSON.stringify(r)).join('\n');
    return new Response(body, { status: 200, headers });
  }

  headers.set('Content-Type', 'text/csv; charset=utf-8');
  const head = ['id', 'createdAt', 'action', 'actorId', 'environmentId', 'entity', 'entityId', 'entityName', 'metadata'];
  const lines = [head.join(',')];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.id),
        csvEscape(r.createdAt.toISOString()),
        csvEscape(r.action),
        csvEscape(r.actorId),
        csvEscape(r.environmentId),
        csvEscape(r.entity),
        csvEscape(r.entityId),
        csvEscape(r.entityName),
        csvEscape(r.metadata),
      ].join(',')
    );
  }
  return new Response(lines.join('\n'), { status: 200, headers });
}
