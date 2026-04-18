import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentityOrNull } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentityOrNull();
  const body = await req.json().catch(() => ({}));
  const { event, metadata, timestamp } = body;

  if (!event || typeof event !== 'string') {
    return Response.json({ error: 'event required' }, { status: 400 });
  }

  // Store in audit log — lightweight, no new table needed
  await prisma.auditLog.create({
    data: {
      action: event,
      entity: 'funnel',
      entityId: identity?.id || 'anonymous',
      entityName: event.replace('funnel.', ''),
      metadata: metadata ? JSON.stringify(metadata) : null,
      actorType: identity ? 'USER' : 'SYSTEM',
      actorName: identity?.name || 'Anonymous',
      actorId: identity?.id || null,
    },
  }).catch(() => {});

  return Response.json({ ok: true });
}
