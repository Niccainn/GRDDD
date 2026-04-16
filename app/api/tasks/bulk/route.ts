import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const { taskIds, action, data } = await req.json();

  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return Response.json({ error: 'taskIds array required' }, { status: 400 });
  }
  if (!['update', 'delete'].includes(action)) {
    return Response.json({ error: 'action must be "update" or "delete"' }, { status: 400 });
  }

  // Verify all tasks belong to environments the user can WRITE to (owner or ADMIN/CONTRIBUTOR)
  const envIds = await prisma.environment.findMany({
    where: {
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id, role: { in: ['ADMIN', 'CONTRIBUTOR'] } } } },
      ],
    },
    select: { id: true },
  }).then(envs => envs.map(e => e.id));

  const validTasks = await prisma.task.findMany({
    where: { id: { in: taskIds }, deletedAt: null, environmentId: { in: envIds } },
    select: { id: true },
  });
  const validIds = validTasks.map(t => t.id);

  if (validIds.length === 0) return Response.json({ error: 'No accessible tasks' }, { status: 404 });

  if (action === 'delete') {
    const result = await prisma.task.updateMany({
      where: { id: { in: validIds } },
      data: { deletedAt: new Date() },
    });
    return Response.json({ affected: result.count });
  }

  // Update
  const updateData: Record<string, unknown> = {};
  if (data?.status) {
    updateData.status = data.status;
    if (data.status === 'DONE') updateData.completedAt = new Date();
    else updateData.completedAt = null;
  }
  if (data?.priority) updateData.priority = data.priority;
  if (data?.assigneeId !== undefined) updateData.assigneeId = data.assigneeId || null;

  const result = await prisma.task.updateMany({
    where: { id: { in: validIds } },
    data: updateData,
  });

  return Response.json({ affected: result.count });
}
