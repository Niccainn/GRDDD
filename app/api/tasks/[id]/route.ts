import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { assertCanWriteEnvironment } from '@/lib/auth/ownership';

// GET /api/tasks/:id — get a single task with subtasks and comments
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: {
      id,
      deletedAt: null,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id } } },
        ],
      },
    },
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
      system: { select: { id: true, name: true, color: true } },
      environment: { select: { id: true, name: true, color: true } },
      subtasks: {
        where: { deletedAt: null },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
          _count: { select: { subtasks: true, comments: true } },
        },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        take: 100,
      },
      _count: { select: { subtasks: true, comments: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json(task);
}

// PATCH /api/tasks/:id — update a task
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const body = await req.json();

  // Find the task (read access — any member)
  const task = await prisma.task.findFirst({
    where: {
      id,
      deletedAt: null,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id } } },
        ],
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Verify write access (owner or ADMIN/CONTRIBUTOR — VIEWERs rejected)
  await assertCanWriteEnvironment(task.environmentId, identity.id);

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === 'DONE') data.completedAt = new Date();
    if (body.status !== 'DONE' && task.status === 'DONE') data.completedAt = null;
  }
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.position !== undefined) data.position = body.position;
  if (body.systemId !== undefined) data.systemId = body.systemId || null;
  if (body.labels !== undefined) data.labels = body.labels ? JSON.stringify(body.labels) : null;
  if (body.assigneeId !== undefined) {
    data.assigneeId = body.assigneeId || null;
    // Notify new assignee
    if (body.assigneeId && body.assigneeId !== identity.id && body.assigneeId !== task.assigneeId) {
      await prisma.notification.create({
        data: {
          type: 'task.assigned',
          title: `You were assigned "${task.title}"`,
          body: `${identity.name} assigned you a task`,
          href: `/tasks/${id}`,
          identityId: body.assigneeId,
        },
      }).catch(() => {});
    }
  }

  const updated = await prisma.task.update({
    where: { id },
    data,
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
      system: { select: { id: true, name: true, color: true } },
      environment: { select: { id: true, name: true, color: true } },
      _count: { select: { subtasks: true, comments: true } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/tasks/:id — soft delete a task
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: {
      id,
      deletedAt: null,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id } } },
        ],
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Verify write access (owner or ADMIN/CONTRIBUTOR — VIEWERs rejected)
  await assertCanWriteEnvironment(task.environmentId, identity.id);

  await prisma.task.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
