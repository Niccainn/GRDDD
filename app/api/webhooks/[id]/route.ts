import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsWebhook } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { fireWebhooks } from '@/lib/webhooks';
import { assertSafeUrl, resolveAndValidate, SsrfBlockedError } from '@/lib/security/ssrf';

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

  // SSRF guard on update — refuse to persist a URL that points at a
  // private/loopback/metadata address. Sync check only at write time;
  // the DNS-aware check runs at fire time below.
  if (body.url !== undefined) {
    try {
      assertSafeUrl(String(body.url).trim());
    } catch (e) {
      const reason = e instanceof SsrfBlockedError ? e.reason : 'invalid URL';
      return Response.json({ error: `Webhook URL rejected: ${reason}` }, { status: 400 });
    }
  }

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
    // SSRF defense in depth: block at dispatch time even if the stored
    // URL was somehow persisted pre-hardening. DNS-resolving check
    // catches attacker-controlled domains that point at private IPs.
    await resolveAndValidate(webhook.url);
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-GRID-Event': 'test' },
      body: payload,
      signal: AbortSignal.timeout(10_000),
      redirect: 'manual', // don't follow redirects into private space
    });
    status = res.status;
    success = res.ok;
  } catch (err) {
    if (err instanceof SsrfBlockedError) {
      error = 'URL blocked by SSRF policy';
      status = 0;
    } else {
      error = err instanceof Error ? err.message : 'Connection failed';
    }
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
