import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsEnvironment, assertOwnsSystem } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';
  const priority = searchParams.get('priority') ?? '';
  const environmentId = searchParams.get('environmentId') ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

  const signals = await prisma.signal.findMany({
    where: {
      environment: { ownerId: identity.id, deletedAt: null },
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(environmentId ? { environmentId } : {}),
    },
    include: {
      system: { select: { id: true, name: true, color: true } },
      workflow: { select: { id: true, name: true } },
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
  });

  const unreadCount = await prisma.signal.count({
    where: {
      environment: { ownerId: identity.id, deletedAt: null },
      status: 'UNREAD',
      ...(environmentId ? { environmentId } : {}),
    },
  });

  return Response.json({
    signals: signals.map(s => ({
      id: s.id,
      title: s.title,
      body: s.body,
      source: s.source,
      priority: s.priority,
      status: s.status,
      systemId: s.systemId,
      system: s.system,
      workflowId: s.workflowId,
      workflow: s.workflow,
      novaTriaged: s.novaTriaged,
      novaRouting: s.novaRouting ? (() => { try { return JSON.parse(s.novaRouting!); } catch { return null; } })() : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    unreadCount,
  });
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const body = await req.json();
  const { title, body: signalBody, source = 'manual', priority = 'NORMAL', environmentId, systemId } = body;

  if (!title?.trim() || !environmentId) {
    return Response.json({ error: 'title and environmentId required' }, { status: 400 });
  }

  await assertOwnsEnvironment(environmentId, identity.id);
  if (systemId) await assertOwnsSystem(systemId, identity.id);

  const signal = await prisma.signal.create({
    data: {
      title: title.trim(),
      body: signalBody?.trim() || null,
      source,
      priority,
      environmentId,
      systemId: systemId || null,
    },
    include: {
      system: { select: { id: true, name: true, color: true } },
    },
  });

  return Response.json({
    id: signal.id,
    title: signal.title,
    body: signal.body,
    source: signal.source,
    priority: signal.priority,
    status: signal.status,
    systemId: signal.systemId,
    system: signal.system,
    createdAt: signal.createdAt.toISOString(),
  }, { status: 201 });
}
