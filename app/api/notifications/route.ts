import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

// GET /api/notifications?page=1&limit=20&unread=true
export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const unreadOnly = searchParams.get('unread') === 'true';

  const where: Record<string, unknown> = { identityId: identity.id };
  if (unreadOnly) where.read = false;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { identityId: identity.id, read: false },
    }),
  ]);

  return NextResponse.json({
    notifications,
    unreadCount,
    hasMore: page * limit < total,
  });
}

// PATCH /api/notifications — mark as read
// Body: { ids: string[] } or { all: true }
export async function PATCH(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();

  // Legacy support: { markAllRead: true } or new { all: true }
  if (body.all || body.markAllRead) {
    await prisma.notification.updateMany({
      where: { identityId: identity.id, read: false },
      data: { read: true, readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  // Mark specific notifications by ids array
  if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: body.ids }, identityId: identity.id },
      data: { read: true, readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  // Legacy support: single { id: string }
  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, identityId: identity.id },
      data: { read: true, readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Provide ids array, id, or all: true' }, { status: 400 });
}

// DELETE /api/notifications?id=xxx
export async function DELETE(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  }

  // Only delete own notifications
  const deleted = await prisma.notification.deleteMany({
    where: { id, identityId: identity.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
