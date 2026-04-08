import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { searchParams } = new URL(req.url);
  const systemId = searchParams.get('systemId') ?? undefined;
  const environmentId = searchParams.get('environmentId') ?? undefined;

  const goals = await prisma.goal.findMany({
    where: {
      ...(systemId ? { systemId } : {}),
      ...(environmentId ? { environmentId } : {}),
    },
    include: {
      system: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(goals.map(g => ({
    id: g.id,
    title: g.title,
    description: g.description,
    metric: g.metric,
    target: g.target,
    current: g.current,
    status: g.status,
    progress: g.progress,
    dueDate: g.dueDate?.toISOString() ?? null,
    systemId: g.systemId,
    system: g.system,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const body = await req.json();
  const { title, description, metric, target, dueDate, systemId, environmentId } = body;

  if (!title?.trim() || !systemId || !environmentId) {
    return Response.json({ error: 'title, systemId, and environmentId required' }, { status: 400 });
  }

  if (!identity) return Response.json({ error: 'Identity not found' }, { status: 404 });

  const goal = await prisma.goal.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      metric: metric?.trim() || null,
      target: target?.trim() || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      systemId,
      environmentId,
      creatorId: identity.id,
    },
    include: { system: { select: { id: true, name: true, color: true } } },
  });

  return Response.json({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    metric: goal.metric,
    target: goal.target,
    current: goal.current,
    status: goal.status,
    progress: goal.progress,
    dueDate: goal.dueDate?.toISOString() ?? null,
    systemId: goal.systemId,
    system: goal.system,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  }, { status: 201 });
}
