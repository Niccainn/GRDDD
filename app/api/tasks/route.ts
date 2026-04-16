import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { assertCanWriteEnvironment } from '@/lib/auth/ownership';

// GET /api/tasks — list tasks with filters
export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const url = req.nextUrl;
  const environmentId = url.searchParams.get('environmentId');
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  const assigneeId = url.searchParams.get('assigneeId');
  const parentId = url.searchParams.get('parentId');
  const search = url.searchParams.get('q');

  // Get environments the user owns or is a member of
  const envIds = await prisma.environment.findMany({
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
    deletedAt: null,
    environmentId: environmentId ? { in: envIds.includes(environmentId) ? [environmentId] : [] } : { in: envIds },
    parentId: parentId ?? null, // top-level by default
  };

  if (status) {
    if (status === 'active') {
      where.status = { in: ['TODO', 'IN_PROGRESS', 'REVIEW'] };
    } else {
      where.status = status;
    }
  }
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (search) where.title = { contains: search };

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
      system: { select: { id: true, name: true, color: true } },
      environment: { select: { id: true, name: true, color: true } },
      _count: { select: { subtasks: true, comments: true } },
    },
    take: 200,
  });

  // Get counts by status for the kanban view
  const statusCounts = await prisma.task.groupBy({
    by: ['status'],
    where: { deletedAt: null, environmentId: environmentId ? environmentId : { in: envIds }, parentId: null },
    _count: true,
  });

  const counts: Record<string, number> = {};
  statusCounts.forEach((s: { status: string; _count: number }) => { counts[s.status] = s._count; });

  return NextResponse.json({ tasks, counts });
}

// POST /api/tasks — create a task
export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const body = await req.json();
  const { title, description, status, priority, dueDate, environmentId, systemId, assigneeId, parentId, labels } = body;

  if (!title || !environmentId) {
    return NextResponse.json({ error: 'title and environmentId required' }, { status: 400 });
  }

  // Validate labels — must be an array of strings if provided
  if (labels !== undefined && labels !== null) {
    if (!Array.isArray(labels) || !labels.every((l: unknown) => typeof l === 'string')) {
      return NextResponse.json({ error: 'labels must be an array of strings' }, { status: 400 });
    }
  }

  // Validate enums if provided
  const validStatuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
  const validPriorities = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
  }
  if (priority && !validPriorities.includes(priority)) {
    return NextResponse.json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` }, { status: 400 });
  }

  // Verify write access to environment (owner or ADMIN/CONTRIBUTOR — VIEWERs rejected)
  await assertCanWriteEnvironment(environmentId, identity.id);

  // Get max position for ordering
  const maxPos = await prisma.task.aggregate({
    where: { environmentId, status: status ?? 'TODO', parentId: parentId ?? null },
    _max: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      title,
      description: description ?? null,
      status: status ?? 'TODO',
      priority: priority ?? 'NORMAL',
      dueDate: dueDate ? new Date(dueDate) : null,
      position: (maxPos._max.position ?? 0) + 1000,
      labels: labels ? JSON.stringify(labels) : null,
      environmentId,
      systemId: systemId ?? null,
      creatorId: identity.id,
      assigneeId: assigneeId ?? null,
      parentId: parentId ?? null,
    },
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
      system: { select: { id: true, name: true, color: true } },
      environment: { select: { id: true, name: true, color: true } },
      _count: { select: { subtasks: true, comments: true } },
    },
  });

  // Notify assignee if different from creator
  if (assigneeId && assigneeId !== identity.id) {
    await prisma.notification.create({
      data: {
        type: 'task.assigned',
        title: `You were assigned "${title}"`,
        body: `${identity.name} assigned you a task`,
        href: `/tasks/${task.id}`,
        identityId: assigneeId,
      },
    }).catch(() => {});
  }

  return NextResponse.json(task, { status: 201 });
}
