import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'));
  const type  = searchParams.get('type') ?? '';
  const range = searchParams.get('range') ?? 'all';
  const q     = searchParams.get('q') ?? '';

  // Build date filter
  let dateFilter: { gte?: Date } = {};
  const now = new Date();
  if (range === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    dateFilter = { gte: start };
  } else if (range === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    dateFilter = { gte: start };
  } else if (range === 'month') {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    dateFilter = { gte: start };
  }

  // Build type filter — maps category to action prefix
  const typeMap: Record<string, string> = {
    system: 'system.',
    workflow: 'workflow.',
    execution: 'execution.',
    goal: 'goal.',
    agent: 'nova.',
    team: 'member.',
  };

  // Scope to environments the user owns or is a member of.
  const userEnvIds = await prisma.environment.findMany({
    where: {
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
    select: { id: true },
  }).then(envs => envs.map(e => e.id));

  const where: Record<string, unknown> = {
    OR: [
      { environmentId: { in: userEnvIds } },
      { actorId: identity.id },
    ],
  };

  if (type && typeMap[type]) {
    where.action = { startsWith: typeMap[type] };
  }

  if (dateFilter.gte) {
    where.createdAt = dateFilter;
  }

  if (q) {
    where.OR = [
      { action: { contains: q } },
      { entityName: { contains: q } },
      { actorName: { contains: q } },
      { entity: { contains: q } },
    ];
  }

  const [events, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return Response.json({
    events,
    total,
    hasMore: page * limit < total,
  });
}
