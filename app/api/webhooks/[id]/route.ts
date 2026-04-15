import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsWebhook } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { fireWebhooks } from '@/lib/webhooks';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsWebhook(id, identity.id);
  const webhook = await prisma.webhook.findUnique({
    where: { id },
    include: {
      deliveries: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
  if (!webhook) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({
    ...webhook,
    events: JSON.parse(webhook.events ?? '[]'),
    deliveries: webhook.deliveries,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsWebhook(id, identity.id);
  const body = await req.json();
  const updated = await prisma.webhook.update({
    where: { id },
    data: {
      ...(body.name      !== undefined && { name:      body.name.trim() }),
      ...(body.url       !== undefined && { url:       body.url.trim()  }),
      ...(body.events    !== undefined && { events:    JSON.stringify(body.events) }),
      ...(body.isActive  !== undefined && { isActive:  body.isActive   }),
      ...(body.secret    !== undefined && { secret:    body.secret || null }),
    },
  });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsWebhook(id, identity.id);
  await prisma.webhook.delete({ where: { id } });
  return Response.json({ deleted: true });
}

// POST to /api/webhooks/[id] — test fire
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsWebhook(id, identity.id);
  const webhook = await prisma.webhook.findUnique({ where: { id } });
  if (!webhook) return Response.json({ error: 'Not found' }, { status: 404 });

  const start = Date.now();
  let status: number | null = null;
  let success = false;
  let error: string | null = null;

  const payload = JSON.stringify({
    event: 'test',
    timestamp: new Date().toISOString(),
    data: { message: 'This is a test delivery from GRID', webhookId: id },
  });

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-GRID-Event': 'test' },
      body: payload,
      signal: AbortSignal.timeout(10_000),
    });
    status = res.status;
    success = res.ok;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Connection failed';
  }

  await prisma.webhookDelivery.create({
    data: {
      event: 'test',
      payload,
      status,
      success,
      error,
      duration: Date.now() - start,
      webhookId: id,
    },
  });

  return Response.json({ success, status, error, duration: Date.now() - start });
}
