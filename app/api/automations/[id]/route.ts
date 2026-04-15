import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

async function getOwnedAutomation(id: string, identityId: string) {
  const automation = await prisma.automation.findFirst({
    where: { id, identityId },
    include: {
      environment: { select: { id: true, name: true, slug: true } },
    },
  });
  return automation;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const automation = await getOwnedAutomation(id, identity.id);
  if (!automation) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({
    id: automation.id,
    name: automation.name,
    description: automation.description,
    trigger: automation.trigger,
    triggerConfig: automation.triggerConfig,
    nodes: automation.nodes,
    edges: automation.edges,
    isActive: automation.isActive,
    environmentId: automation.environmentId,
    environmentName: automation.environment.name,
    runCount: automation.runCount,
    lastRunAt: automation.lastRunAt?.toISOString() ?? null,
    createdAt: automation.createdAt.toISOString(),
    updatedAt: automation.updatedAt.toISOString(),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const existing = await getOwnedAutomation(id, identity.id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.trigger !== undefined) data.trigger = body.trigger;
  if (body.triggerConfig !== undefined) data.triggerConfig = typeof body.triggerConfig === 'string' ? body.triggerConfig : JSON.stringify(body.triggerConfig);
  if (body.nodes !== undefined) data.nodes = typeof body.nodes === 'string' ? body.nodes : JSON.stringify(body.nodes);
  if (body.edges !== undefined) data.edges = typeof body.edges === 'string' ? body.edges : JSON.stringify(body.edges);
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const updated = await prisma.automation.update({
    where: { id },
    data,
  });

  return Response.json({
    id: updated.id,
    name: updated.name,
    isActive: updated.isActive,
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const existing = await getOwnedAutomation(id, identity.id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  await prisma.automation.delete({ where: { id } });
  return Response.json({ deleted: true });
}
