import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  // Scope to environments the user owns or is a member of.
  const userEnvIds = await prisma.environment.findMany({
    where: {
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
    select: { id: true },
  }).then(envs => envs.map(e => e.id));

  const webhooks = await prisma.webhook.findMany({
    where: { environmentId: { in: userEnvIds } },
    include: {
      _count: { select: { deliveries: true } },
      deliveries: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true, success: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(webhooks.map(w => ({
    id: w.id,
    name: w.name,
    url: w.url,
    events: JSON.parse(w.events ?? '[]'),
    isActive: w.isActive,
    environmentId: w.environmentId,
    totalDeliveries: w._count.deliveries,
    lastDelivery: w.deliveries[0] ?? null,
    createdAt: w.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const body = await req.json();
  const { name, url, events, environmentId, secret } = body;

  if (!name?.trim() || !url?.trim()) {
    return Response.json({ error: 'Name and URL are required' }, { status: 400 });
  }

  // Validate URL
  try { new URL(url); } catch {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!Array.isArray(events) || events.length === 0) {
    return Response.json({ error: 'Select at least one event' }, { status: 400 });
  }

  // Verify environment ownership if environmentId provided.
  if (environmentId) {
    const env = await prisma.environment.findFirst({
      where: {
        id: environmentId,
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id } } },
        ],
      },
      select: { id: true },
    });
    if (!env) {
      return Response.json({ error: 'Environment not found' }, { status: 404 });
    }
  }

  const webhook = await prisma.webhook.create({
    data: {
      name: name.trim(),
      url: url.trim(),
      events: JSON.stringify(events),
      isActive: true,
      secret: secret?.trim() || null,
      environmentId: environmentId || null,
    },
  });

  return Response.json({ id: webhook.id }, { status: 201 });
}
