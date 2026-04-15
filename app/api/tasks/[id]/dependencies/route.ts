import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

// GET — list dependencies for a task
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null, environment: { OR: [{ ownerId: identity.id }, { memberships: { some: { identityId: identity.id } } }] } },
  });
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 });

  const [from, to] = await Promise.all([
    prisma.taskDependency.findMany({
      where: { sourceTaskId: id },
      include: { targetTask: { select: { id: true, title: true, status: true, priority: true } } },
    }),
    prisma.taskDependency.findMany({
      where: { targetTaskId: id },
      include: { sourceTask: { select: { id: true, title: true, status: true, priority: true } } },
    }),
  ]);

  return Response.json({
    blocks: from.filter(d => d.type === 'blocks').map(d => d.targetTask),
    blockedBy: to.filter(d => d.type === 'blocks').map(d => d.sourceTask),
    relatesTo: [
      ...from.filter(d => d.type === 'relates_to').map(d => d.targetTask),
      ...to.filter(d => d.type === 'relates_to').map(d => d.sourceTask),
    ],
  });
}

// POST — add a dependency
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const { targetTaskId, type } = await req.json();

  if (!targetTaskId || !['blocks', 'relates_to'].includes(type)) {
    return Response.json({ error: 'targetTaskId and type (blocks|relates_to) required' }, { status: 400 });
  }

  if (targetTaskId === id) {
    return Response.json({ error: 'Cannot depend on self' }, { status: 400 });
  }

  // Verify both tasks exist and user has access
  const tasks = await prisma.task.findMany({
    where: { id: { in: [id, targetTaskId] }, deletedAt: null, environment: { OR: [{ ownerId: identity.id }, { memberships: { some: { identityId: identity.id } } }] } },
  });
  if (tasks.length !== 2) return Response.json({ error: 'Task not found' }, { status: 404 });

  const dep = await prisma.taskDependency.create({
    data: { sourceTaskId: id, targetTaskId, type },
  });

  return Response.json(dep, { status: 201 });
}

// DELETE — remove a dependency
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const depId = searchParams.get('depId');

  if (!depId) return Response.json({ error: 'depId required' }, { status: 400 });

  // Verify the dependency belongs to a task the user has access to
  const dep = await prisma.taskDependency.findFirst({
    where: { id: depId, sourceTask: { id, environment: { OR: [{ ownerId: identity.id }, { memberships: { some: { identityId: identity.id } } }] } } },
  });
  if (!dep) return Response.json({ error: 'Not found' }, { status: 404 });

  await prisma.taskDependency.delete({ where: { id: depId } });
  return Response.json({ ok: true });
}
