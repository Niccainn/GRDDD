import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

// GET /api/tasks/:id/comments
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  // Verify access
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
    select: { id: true },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const comments = await prisma.taskComment.findMany({
    where: { taskId: id },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return NextResponse.json(comments);
}

// POST /api/tasks/:id/comments
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const body = await req.json();

  if (!body.body?.trim()) {
    return NextResponse.json({ error: 'Comment body required' }, { status: 400 });
  }

  // Verify access
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
    select: { id: true, title: true, creatorId: true, assigneeId: true },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const comment = await prisma.taskComment.create({
    data: {
      body: body.body.trim(),
      taskId: id,
      authorId: identity.id,
      authorName: identity.name,
    },
  });

  // Notify task creator and assignee (if different from commenter)
  const notifyIds = new Set<string>();
  if (task.creatorId && task.creatorId !== identity.id) notifyIds.add(task.creatorId);
  if (task.assigneeId && task.assigneeId !== identity.id) notifyIds.add(task.assigneeId);

  for (const targetId of notifyIds) {
    await prisma.notification.create({
      data: {
        type: 'task.commented',
        title: `New comment on "${task.title}"`,
        body: `${identity.name}: ${body.body.trim().slice(0, 100)}`,
        href: `/tasks/${id}`,
        identityId: targetId,
      },
    }).catch(() => {});
  }

  return NextResponse.json(comment, { status: 201 });
}
