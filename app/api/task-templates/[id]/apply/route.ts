import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const { environmentId } = await req.json();

  if (!environmentId) return Response.json({ error: 'environmentId required' }, { status: 400 });

  const template = await prisma.taskTemplate.findFirst({
    where: { id, OR: [{ creatorId: identity.id }, { isGlobal: true }] },
  });
  if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });

  // Verify environment access
  const env = await prisma.environment.findFirst({
    where: { id: environmentId, deletedAt: null, OR: [{ ownerId: identity.id }, { memberships: { some: { identityId: identity.id } } }] },
  });
  if (!env) return Response.json({ error: 'Environment not found' }, { status: 404 });

  const data = JSON.parse(template.templateData);

  // Create main task
  const task = await prisma.task.create({
    data: {
      title: data.title || template.name,
      description: data.description || null,
      status: 'TODO',
      priority: data.priority || 'NORMAL',
      labels: data.labels ? JSON.stringify(data.labels) : null,
      environmentId,
      creatorId: identity.id,
      position: 0,
    },
  });

  // Create subtasks if any
  if (Array.isArray(data.subtasks)) {
    for (let i = 0; i < data.subtasks.length; i++) {
      const sub = data.subtasks[i];
      await prisma.task.create({
        data: {
          title: typeof sub === 'string' ? sub : sub.title,
          description: typeof sub === 'string' ? null : sub.description || null,
          status: 'TODO',
          priority: typeof sub === 'string' ? 'NORMAL' : sub.priority || 'NORMAL',
          environmentId,
          creatorId: identity.id,
          parentId: task.id,
          position: i,
        },
      });
    }
  }

  return Response.json(task, { status: 201 });
}
