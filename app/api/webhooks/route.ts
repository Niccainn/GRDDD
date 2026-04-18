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

  // Validate URL + block SSRF targets (private/loopback/metadata).
  try {
    const { assertSafeUrl } = await import('@/lib/security/ssrf');
    assertSafeUrl(url.trim());
  } catch (e) {
    const { SsrfBlockedError } = await import('@/lib/security/ssrf');
    const msg = e instanceof SsrfBlockedError ? `Webhook URL rejected: ${e.reason}` : 'Invalid URL';
    return Response.json({ error: msg }, { status: 400 });
  }

  if (!Array.isArray(events) || events.length === 0) {
    return Response.json({ error: 'Select at least one event' }, { status: 400 });
  }

  // Verify write access to environment (owner or ADMIN/CONTRIBUTOR)
  if (environmentId) {
    const { assertCanWriteEnvironment } = await import('@/lib/auth/ownership');
    await assertCanWriteEnvironment(environmentId, identity.id);
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
