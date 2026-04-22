import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id: environmentId } = await params;

  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
    select: { id: true, ownerId: true, owner: { select: { id: true, name: true, email: true } } },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const memberships = await prisma.environmentMembership.findMany({
    where: { environmentId },
    select: {
      id: true,
      role: true,
      createdAt: true,
      identity: { select: { id: true, name: true, email: true, avatar: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Owner is always first, not in memberships table
  const owner = {
    id: env.owner.id,
    name: env.owner.name,
    email: env.owner.email,
    role: 'OWNER',
    membershipId: null,
    joinedAt: null,
  };

  const members = memberships.map(m => ({
    id: m.identity.id,
    name: m.identity.name,
    email: m.identity.email,
    avatar: m.identity.avatar,
    role: m.role,
    membershipId: m.id,
    joinedAt: m.createdAt,
  }));

  return Response.json({ owner, members });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const { id: environmentId } = await params;

  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
    select: { id: true },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const { membershipId } = await req.json();
  await prisma.environmentMembership.deleteMany({
    where: { id: membershipId, environmentId },
  });

  return Response.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const { id: environmentId } = await params;

  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
    select: { id: true },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const { membershipId, role } = await req.json();
  if (!['ADMIN', 'CONTRIBUTOR', 'VIEWER'].includes(role)) {
    return Response.json({ error: 'Invalid role' }, { status: 400 });
  }

  const updated = await prisma.environmentMembership.update({
    where: { id: membershipId },
    data: { role },
    select: { id: true, role: true },
  });

  return Response.json({ membership: updated });
}
