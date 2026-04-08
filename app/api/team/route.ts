import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const members = await prisma.identity.findMany({
    include: {
      environmentMemberships: {
        include: { environment: { select: { id: true, name: true, color: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return Response.json(members.map(m => ({
    id: m.id,
    name: m.name,
    email: m.email,
    type: m.type,
    avatar: m.avatar,
    createdAt: m.createdAt.toISOString(),
    memberships: m.environmentMemberships.map(em => ({
      role: em.role,
      environmentId: em.environmentId,
      environmentName: em.environment.name,
      environmentColor: em.environment.color,
    })),
  })));
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { name, email, type, environmentId, role } = await req.json();
  if (!name || !email) return Response.json({ error: 'Name and email required' }, { status: 400 });

  const existing = await prisma.identity.findFirst({ where: { email } });
  if (existing) return Response.json({ error: 'Email already exists' }, { status: 409 });

  const newMember = await prisma.identity.create({
    data: { name, email, type: type ?? 'PERSON' },
  });

  if (environmentId && role) {
    await prisma.environmentMembership.create({
      data: { environmentId, identityId: newMember.id, role },
    });
  }

  return Response.json({ id: newMember.id, name: newMember.name, email: newMember.email });
}

export async function DELETE(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  // Can't delete yourself
  if (id === identity.id) {
    return Response.json({ error: 'Cannot remove yourself' }, { status: 403 });
  }

  await prisma.identity.delete({ where: { id } });
  return Response.json({ deleted: true });
}
