import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import type { EntityType } from '@/lib/views';
import { getColumnDefs } from '@/lib/views';

// ---------------------------------------------------------------------------
// GET /api/views?entity=tasks&filters=...&sort=field:asc&page=1&limit=50
// Unified data endpoint -- queries the appropriate Prisma model based on
// entity type and applies filters, sorting, and pagination.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const entity = (searchParams.get('entity') ?? 'tasks') as EntityType;
  const filtersRaw = searchParams.get('filters');
  const sortRaw = searchParams.get('sort');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const skip = (page - 1) * limit;

  // Parse filters: JSON array of {field, operator, value}
  let filters: { field: string; operator: string; value: string }[] = [];
  if (filtersRaw) {
    try { filters = JSON.parse(filtersRaw); } catch { /* ignore bad JSON */ }
  }

  // Parse sort: "field:asc" or "field:desc"
  const orderBy: Record<string, string> = {};
  if (sortRaw) {
    const [field, dir] = sortRaw.split(':');
    if (field) orderBy[field] = dir === 'desc' ? 'desc' : 'asc';
  }

  const columns = getColumnDefs(entity);

  try {
    switch (entity) {
      case 'tasks':
        return await queryTasks(identity.id, filters, orderBy, skip, limit, columns);
      case 'workflows':
        return await queryWorkflows(identity.id, filters, orderBy, skip, limit, columns);
      case 'systems':
        return await querySystems(identity.id, filters, orderBy, skip, limit, columns);
      case 'goals':
        return await queryGoals(identity.id, filters, orderBy, skip, limit, columns);
      case 'executions':
        return await queryExecutions(identity.id, filters, orderBy, skip, limit, columns);
      default:
        return Response.json({ error: 'Invalid entity type' }, { status: 400 });
    }
  } catch (err) {
    console.error('[views API]', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Helpers to build Prisma where clauses from generic filters
// ---------------------------------------------------------------------------

function applyFilter(where: Record<string, unknown>, f: { field: string; operator: string; value: string }) {
  switch (f.operator) {
    case 'eq':
      where[f.field] = f.value;
      break;
    case 'neq':
      where[f.field] = { not: f.value };
      break;
    case 'contains':
      where[f.field] = { contains: f.value };
      break;
    case 'gt':
      where[f.field] = { gt: f.value };
      break;
    case 'lt':
      where[f.field] = { lt: f.value };
      break;
  }
}

// ---------------------------------------------------------------------------
// Entity-specific query functions
// ---------------------------------------------------------------------------

async function queryTasks(
  identityId: string,
  filters: { field: string; operator: string; value: string }[],
  orderBy: Record<string, string>,
  skip: number, limit: number,
  columns: { key: string; label: string; type: string }[],
) {
  const envIds = await getOwnedEnvIds(identityId);
  const where: Record<string, unknown> = { deletedAt: null, environmentId: { in: envIds }, parentId: null };
  for (const f of filters) applyFilter(where, f);

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: 'desc' },
      skip, take: limit,
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        system: { select: { id: true, name: true, color: true } },
        environment: { select: { id: true, name: true, color: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  const rows = data.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assignee: t.assignee?.name ?? '',
    creator: t.creator?.name ?? '',
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    labels: t.labels,
    environment: t.environment?.name ?? '',
    system: t.system?.name ?? '',
    subtasks: t._count.subtasks,
    comments: t._count.comments,
  }));

  return Response.json({ data: rows, total, columns });
}

async function queryWorkflows(
  identityId: string,
  filters: { field: string; operator: string; value: string }[],
  orderBy: Record<string, string>,
  skip: number, limit: number,
  columns: { key: string; label: string; type: string }[],
) {
  const where: Record<string, unknown> = { environment: { ownerId: identityId, deletedAt: null } };
  for (const f of filters) applyFilter(where, f);

  const [data, total] = await Promise.all([
    prisma.workflow.findMany({
      where,
      orderBy: Object.keys(orderBy).length ? orderBy : { updatedAt: 'desc' },
      skip, take: limit,
      include: {
        system: true,
        environment: true,
        _count: { select: { executions: true } },
      },
    }),
    prisma.workflow.count({ where }),
  ]);

  const rows = data.map(w => ({
    id: w.id,
    name: w.name,
    description: w.description,
    status: w.status,
    systemName: w.system.name,
    environmentName: w.environment.name,
    executions: w._count.executions,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  }));

  return Response.json({ data: rows, total, columns });
}

async function querySystems(
  identityId: string,
  filters: { field: string; operator: string; value: string }[],
  orderBy: Record<string, string>,
  skip: number, limit: number,
  columns: { key: string; label: string; type: string }[],
) {
  const where: Record<string, unknown> = { environment: { ownerId: identityId, deletedAt: null } };
  for (const f of filters) applyFilter(where, f);

  const [data, total] = await Promise.all([
    prisma.system.findMany({
      where,
      orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: 'desc' },
      skip, take: limit,
      include: {
        environment: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        _count: { select: { workflows: true, executions: true } },
      },
    }),
    prisma.system.count({ where }),
  ]);

  const rows = data.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    color: s.color,
    healthScore: s.healthScore,
    environmentId: s.environment?.name ?? s.environmentId,
    creator: s.creator?.name ?? '',
    workflows: s._count.workflows,
    executions: s._count.executions,
    createdAt: s.createdAt.toISOString(),
  }));

  return Response.json({ data: rows, total, columns });
}

async function queryGoals(
  identityId: string,
  filters: { field: string; operator: string; value: string }[],
  orderBy: Record<string, string>,
  skip: number, limit: number,
  columns: { key: string; label: string; type: string }[],
) {
  const where: Record<string, unknown> = { environment: { ownerId: identityId, deletedAt: null } };
  for (const f of filters) applyFilter(where, f);

  const [data, total] = await Promise.all([
    prisma.goal.findMany({
      where,
      orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: 'desc' },
      skip, take: limit,
      include: { system: { select: { id: true, name: true, color: true } } },
    }),
    prisma.goal.count({ where }),
  ]);

  const rows = data.map(g => ({
    id: g.id,
    title: g.title,
    description: g.description,
    status: g.status,
    progress: g.progress,
    metric: g.metric,
    target: g.target,
    current: g.current,
    dueDate: g.dueDate?.toISOString() ?? null,
    system: g.system?.name ?? '',
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }));

  return Response.json({ data: rows, total, columns });
}

async function queryExecutions(
  identityId: string,
  filters: { field: string; operator: string; value: string }[],
  orderBy: Record<string, string>,
  skip: number, limit: number,
  columns: { key: string; label: string; type: string }[],
) {
  const where: Record<string, unknown> = { system: { environment: { ownerId: identityId, deletedAt: null } } };
  for (const f of filters) applyFilter(where, f);

  const [data, total] = await Promise.all([
    prisma.execution.findMany({
      where,
      orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: 'desc' },
      skip, take: limit,
      include: {
        system: { select: { id: true, name: true } },
        workflow: { select: { id: true, name: true } },
        validationResult: { select: { score: true } },
      },
    }),
    prisma.execution.count({ where }),
  ]);

  const rows = data.map(e => ({
    id: e.id,
    status: e.status,
    input: (e.input ?? '').slice(0, 120),
    system: e.system?.name ?? '',
    workflow: e.workflow?.name ?? '',
    validationScore: e.validationResult?.score ?? null,
    createdAt: e.createdAt.toISOString(),
    completedAt: e.completedAt?.toISOString() ?? null,
  }));

  return Response.json({ data: rows, total, columns });
}

// ---------------------------------------------------------------------------
// Shared helper: get environment IDs the user owns or is a member of
// ---------------------------------------------------------------------------

async function getOwnedEnvIds(identityId: string): Promise<string[]> {
  const envs = await prisma.environment.findMany({
    where: {
      deletedAt: null,
      OR: [
        { ownerId: identityId },
        { memberships: { some: { identityId } } },
      ],
    },
    select: { id: true },
  });
  return envs.map(e => e.id);
}
