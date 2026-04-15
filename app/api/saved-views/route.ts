import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entityType');
  const environmentId = searchParams.get('environmentId');

  const where: Record<string, unknown> = {
    OR: [
      { creatorId: identity.id },
      { isShared: true },
    ],
  };
  if (entityType) where.entityType = entityType;
  if (environmentId) where.environmentId = environmentId;

  const views = await prisma.savedView.findMany({
    where,
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  });

  return Response.json(views);
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const body = await req.json();
  const { name, entityType, viewType, config, environmentId, isShared } = body;

  if (!name || !entityType || !viewType || !config) {
    return Response.json({ error: 'name, entityType, viewType, and config required' }, { status: 400 });
  }

  const view = await prisma.savedView.create({
    data: {
      name,
      entityType,
      viewType,
      config: typeof config === 'string' ? config : JSON.stringify(config),
      environmentId: environmentId || null,
      isShared: isShared || false,
      creatorId: identity.id,
    },
  });

  return Response.json(view, { status: 201 });
}
