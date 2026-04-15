import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const envId = searchParams.get('envId');
  const search = searchParams.get('q');

  // Get environments the user owns or is a member of (matches tasks API pattern)
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
    isArchived: false,
    environmentId: envId
      ? { in: envIds.includes(envId) ? [envId] : [] }
      : { in: envIds },
  };

  if (search) {
    where.title = { contains: search };
  }

  const docs = await prisma.document.findMany({
    where,
    select: {
      id: true,
      title: true,
      icon: true,
      parentId: true,
      environmentId: true,
      updatedAt: true,
      environment: { select: { id: true, name: true, slug: true, color: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return Response.json(docs);
}

export async function POST(req: Request) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { title, environmentId, parentId } = body;

  if (!environmentId) {
    return Response.json({ error: 'environmentId is required' }, { status: 400 });
  }

  // Verify ownership or membership
  const env = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
  });
  if (!env) {
    return Response.json({ error: 'Environment not found' }, { status: 404 });
  }

  const doc = await prisma.document.create({
    data: {
      title: title || 'Untitled',
      environmentId,
      identityId: identity.id,
      parentId: parentId || null,
    },
  });

  return Response.json(doc, { status: 201 });
}
