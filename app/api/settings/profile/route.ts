import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const full = await prisma.identity.findUnique({
    where: { id: identity.id },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      avatar: true,
      createdAt: true,
    },
  });

  if (!full) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json({
    id: full.id,
    name: full.name,
    email: full.email,
    type: full.type,
    avatar: full.avatar,
    createdAt: full.createdAt.toISOString(),
  });
}

export async function PATCH(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { name } = body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return Response.json({ error: 'Name cannot be empty' }, { status: 400 });
    }
  }

  const updated = await prisma.identity.update({
    where: { id: identity.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      avatar: true,
    },
  });

  return Response.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    type: updated.type,
    avatar: updated.avatar,
  });
}
