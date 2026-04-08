import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { name, systemId, environmentId } = await req.json();
  if (!name || !systemId || !environmentId) {
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!identity) {
  }
  const env = await prisma.environment.findUnique({ where: { id: environmentId }, select: { name: true } });
  const workflow = await prisma.workflow.create({
    data: { name, status: 'DRAFT', systemId, environmentId, creatorId: identity.id, stages: JSON.stringify([]) },
  });
  audit({
    action: 'workflow.created',
    entity: 'Workflow',
    entityId: workflow.id,
    entityName: name,
    actorId: identity.id,
    actorName: identity.name,
    environmentId,
    environmentName: env?.name,
  });
  return Response.json({ id: workflow.id });
}

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const systemId = searchParams.get('systemId') ?? '';

  const workflows = await prisma.workflow.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(systemId ? { systemId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      system: true,
      environment: true,
      _count: { select: { executions: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return Response.json(workflows.map(w => ({
    id: w.id,
    name: w.name,
    description: w.description,
    status: w.status,
    stages: (() => { try { return JSON.parse(w.stages ?? '[]'); } catch { return []; } })(),
    systemId: w.systemId,
    systemName: w.system.name,
    environmentName: w.environment.name,
    executions: w._count.executions,
    updatedAt: w.updatedAt.toISOString(),
    createdAt: w.createdAt.toISOString(),
  })));
}
