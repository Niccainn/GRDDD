import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const { searchParams } = new URL(req.url);
  const environmentId = searchParams.get('environmentId');

  const envIds = await prisma.environment.findMany({
    where: { deletedAt: null, OR: [{ ownerId: identity.id }, { memberships: { some: { identityId: identity.id } } }] },
    select: { id: true },
  }).then(envs => envs.map(e => e.id));

  const templates = await prisma.taskTemplate.findMany({
    where: {
      OR: [
        { isGlobal: true },
        { environmentId: environmentId ? { in: envIds.includes(environmentId) ? [environmentId] : [] } : { in: envIds } },
        { creatorId: identity.id },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });

  return Response.json(templates);
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const body = await req.json();
  const { name, description, templateData, category, environmentId, isGlobal } = body;

  if (!name || !templateData) {
    return Response.json({ error: 'name and templateData required' }, { status: 400 });
  }

  const template = await prisma.taskTemplate.create({
    data: {
      name,
      description: description || null,
      templateData: typeof templateData === 'string' ? templateData : JSON.stringify(templateData),
      category: category || 'general',
      isGlobal: isGlobal || false,
      environmentId: environmentId || null,
      creatorId: identity.id,
    },
  });

  return Response.json(template, { status: 201 });
}
