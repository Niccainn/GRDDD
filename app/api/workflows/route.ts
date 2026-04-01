import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { name, systemId, environmentId } = await req.json();
  if (!name || !systemId || !environmentId) {
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }
  let identity = await prisma.identity.findFirst({ where: { email: 'demo@grid.app' } });
  if (!identity) {
    identity = await prisma.identity.create({ data: { type: 'PERSON', name: 'Demo User', email: 'demo@grid.app' } });
  }
  const workflow = await prisma.workflow.create({
    data: { name, status: 'DRAFT', systemId, environmentId, creatorId: identity.id, stages: JSON.stringify([]) },
  });
  return Response.json({ id: workflow.id });
}

export async function GET(req: NextRequest) {
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
