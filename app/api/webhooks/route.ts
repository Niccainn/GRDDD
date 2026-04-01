import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const webhooks = await prisma.webhook.findMany({
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
