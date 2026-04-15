import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const environmentId = searchParams.get('environmentId');
  if (!environmentId) {
    return Response.json({ error: 'environmentId is required' }, { status: 400 });
  }

  // Verify ownership
  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
  });
  if (!env) {
    return Response.json({ error: 'Environment not found' }, { status: 404 });
  }

  const links = await prisma.consequenceLink.findMany({
    where: { environmentId },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(links);
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const {
    sourceType, sourceId, sourceLabel,
    targetType, targetId, targetLabel,
    relationship, impact, description, lagTime,
    environmentId, confidence,
  } = body;

  if (!sourceType || !sourceId || !sourceLabel || !targetType || !targetId || !targetLabel || !relationship || !environmentId) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify ownership
  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
  });
  if (!env) {
    return Response.json({ error: 'Environment not found' }, { status: 404 });
  }

  const link = await prisma.consequenceLink.create({
    data: {
      sourceType,
      sourceId,
      sourceLabel,
      targetType,
      targetId,
      targetLabel,
      relationship,
      impact: impact ?? 'medium',
      description: description ?? null,
      lagTime: lagTime ?? null,
      environmentId,
      confidence: confidence ?? 0.7,
    },
  });

  return Response.json(link, { status: 201 });
}
