import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsEnvironment } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const environmentId = req.nextUrl.searchParams.get('environmentId');
  const scopeType = req.nextUrl.searchParams.get('scopeType');

  if (!environmentId) {
    return Response.json({ error: 'environmentId required' }, { status: 400 });
  }

  await assertOwnsEnvironment(environmentId, identity.id);

  const where: Record<string, string> = { environmentId };
  if (scopeType) where.scopeType = scopeType;

  const configs = await prisma.autonomyConfig.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  });

  return Response.json(configs);
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { scopeType, scopeId, scopeLabel, level, environmentId } = body;

  if (!scopeType || !scopeId || !scopeLabel || level === undefined || !environmentId) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (typeof level !== 'number' || level < 0 || level > 4) {
    return Response.json({ error: 'Level must be 0-4' }, { status: 400 });
  }

  await assertOwnsEnvironment(environmentId, identity.id);

  const config = await prisma.autonomyConfig.upsert({
    where: {
      scopeType_scopeId: { scopeType, scopeId },
    },
    update: {
      level,
      scopeLabel,
      updatedAt: new Date(),
    },
    create: {
      scopeType,
      scopeId,
      scopeLabel,
      level,
      environmentId,
    },
  });

  return Response.json(config);
}
