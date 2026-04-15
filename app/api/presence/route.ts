import { NextRequest, NextResponse } from 'next/server';
import { getAuthIdentityOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  getOnlineUsers,
  getConnections,
  updateConnectionPage,
  broadcast,
} from '@/lib/sse/connections';

export const dynamic = 'force-dynamic';

export async function GET() {
  const identity = await getAuthIdentityOrNull();
  if (!identity) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const onlineUsers = getOnlineUsers();

  // Fetch identity details for online users
  const identityIds = onlineUsers.map((u) => u.identityId);
  const identities = await prisma.identity.findMany({
    where: { id: { in: identityIds } },
    select: { id: true, name: true, avatar: true },
  });

  const identityMap = new Map(identities.map((i) => [i.id, i]));

  const users = onlineUsers.map((u) => {
    const ident = identityMap.get(u.identityId);
    const name = ident?.name ?? 'Unknown';
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return {
      id: u.identityId,
      name,
      initials,
      avatar: ident?.avatar ?? null,
      currentPage: u.currentPage,
      connectedAt: u.connectedAt.toISOString(),
    };
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const page = body.page as string;

  if (!page || typeof page !== 'string') {
    return NextResponse.json({ error: 'page is required' }, { status: 400 });
  }

  // Update all connections for this identity
  const connections = getConnections();
  for (const [id, conn] of connections) {
    if (conn.identityId === identity.id) {
      updateConnectionPage(id, page);
    }
  }

  const initials = identity.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Broadcast presence update to all other clients
  broadcast(
    'presence',
    {
      type: 'page_change',
      user: {
        id: identity.id,
        name: identity.name,
        initials,
        currentPage: page,
      },
    },
    undefined
  );

  return NextResponse.json({ ok: true });
}
