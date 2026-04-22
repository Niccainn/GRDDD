/**
 * GET /api/environments/[id]/exceptions
 *
 * Exceptions feed for the Environment page. Ranked by cost-of-delay,
 * not by date. Unifies three sources:
 *
 *   - Signal with status=UNREAD|TRIAGED and priority HIGH or URGENT
 *   - Execution with status=FAILED in the last 7 days
 *   - Goal with status=AT_RISK or progress below threshold near dueDate
 *
 * Each row carries { id, kind, title, severity, systemName, href }
 * so the widget can render one feed.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id: envId } = await params;

  const env = await prisma.environment.findFirst({
    where: {
      id: envId,
      deletedAt: null,
      OR: [{ ownerId: identity.id }, { memberships: { some: { identityId: identity.id } } }],
    },
    select: { id: true },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const since7 = new Date(Date.now() - 7 * MS_PER_DAY);
  const soon = new Date(Date.now() + 7 * MS_PER_DAY);

  const [signals, failedExecutions, atRiskGoals] = await Promise.all([
    prisma.signal.findMany({
      where: {
        environmentId: envId,
        status: { in: ['UNREAD', 'TRIAGED'] },
        priority: { in: ['HIGH', 'URGENT'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        priority: true,
        createdAt: true,
        systemId: true,
        system: { select: { name: true, color: true } },
      },
    }),
    prisma.execution.findMany({
      where: {
        system: { environmentId: envId },
        status: 'FAILED',
        createdAt: { gte: since7 },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        input: true,
        systemId: true,
        system: { select: { name: true, color: true } },
      },
    }),
    prisma.goal.findMany({
      where: {
        environmentId: envId,
        OR: [
          { status: 'AT_RISK' },
          { status: 'BEHIND' },
          { AND: [{ progress: { lt: 50 } }, { dueDate: { lte: soon, gt: new Date() } }] },
        ],
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        progress: true,
        dueDate: true,
        systemId: true,
        system: { select: { name: true, color: true } },
      },
    }),
  ]);

  type Row = {
    id: string;
    kind: 'signal' | 'failure' | 'goal';
    title: string;
    severity: 'high' | 'urgent' | 'medium' | 'low';
    createdAt: string;
    systemName: string | null;
    systemColor: string | null;
    href: string;
  };

  const rows: Row[] = [];

  for (const s of signals) {
    rows.push({
      id: `signal:${s.id}`,
      kind: 'signal',
      title: s.title,
      severity: s.priority === 'URGENT' ? 'urgent' : 'high',
      createdAt: s.createdAt.toISOString(),
      systemName: s.system?.name ?? null,
      systemColor: s.system?.color ?? null,
      href: '/inbox',
    });
  }
  for (const e of failedExecutions) {
    const first = (e.input ?? '').split('\n')[0].slice(0, 90) || 'Execution failed';
    rows.push({
      id: `failure:${e.id}`,
      kind: 'failure',
      title: first,
      severity: 'high',
      createdAt: e.createdAt.toISOString(),
      systemName: e.system?.name ?? null,
      systemColor: e.system?.color ?? null,
      href: `/executions/${e.id}`,
    });
  }
  for (const g of atRiskGoals) {
    rows.push({
      id: `goal:${g.id}`,
      kind: 'goal',
      title: g.title,
      severity: g.status === 'AT_RISK' ? 'urgent' : 'medium',
      createdAt: (g.dueDate ?? new Date()).toISOString(),
      systemName: g.system?.name ?? null,
      systemColor: g.system?.color ?? null,
      href: `/goals`,
    });
  }

  // Rank: urgent first, then high, then medium/low. Tie-break by
  // recency (most recent first).
  const SEV: Record<Row['severity'], number> = { urgent: 3, high: 2, medium: 1, low: 0 };
  rows.sort((a, b) => {
    const s = SEV[b.severity] - SEV[a.severity];
    return s !== 0 ? s : a.createdAt < b.createdAt ? 1 : -1;
  });

  return Response.json({ rows: rows.slice(0, 15) });
}
