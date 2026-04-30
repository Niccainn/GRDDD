import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const envId = searchParams.get('envId') ?? undefined;

  // Scope through environment.ownerId AND identityId. The identityId
  // alone is insufficient — stale rows from past tests can have an
  // identityId match but point at an environment the user no longer
  // owns, leaking that env's name into the automations list.
  const automations = await prisma.automation.findMany({
    where: {
      identityId: identity.id,
      environment: { ownerId: identity.id, deletedAt: null },
      ...(envId ? { environmentId: envId } : {}),
    },
    include: {
      environment: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return Response.json(automations.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    trigger: a.trigger,
    triggerConfig: a.triggerConfig,
    isActive: a.isActive,
    environmentId: a.environmentId,
    environmentName: a.environment.name,
    runCount: a.runCount,
    lastRunAt: a.lastRunAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { name, trigger, environmentId, triggerConfig, nodes, edges } = body;

  if (!name || !trigger || !environmentId) {
    return Response.json({ error: 'Missing required fields: name, trigger, environmentId' }, { status: 400 });
  }

  // Verify user owns the environment
  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
  });
  if (!env) {
    return Response.json({ error: 'Environment not found' }, { status: 404 });
  }

  const automation = await prisma.automation.create({
    data: {
      name,
      trigger,
      environmentId,
      identityId: identity.id,
      triggerConfig: triggerConfig ? JSON.stringify(triggerConfig) : '{}',
      nodes: nodes ? JSON.stringify(nodes) : '[]',
      edges: edges ? JSON.stringify(edges) : '[]',
    },
  });

  return Response.json({ id: automation.id, name: automation.name });
}
