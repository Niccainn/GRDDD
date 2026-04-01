import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
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
  const { name, email, type, environmentId, role } = await req.json();
  if (!name || !email) return Response.json({ error: 'Name and email required' }, { status: 400 });

  const existing = await prisma.identity.findFirst({ where: { email } });
  if (existing) return Response.json({ error: 'Email already exists' }, { status: 409 });

  const identity = await prisma.identity.create({
    data: { name, email, type: type ?? 'PERSON' },
  });

  if (environmentId && role) {
    await prisma.environmentMembership.create({
      data: { environmentId, identityId: identity.id, role },
    });
  }

  return Response.json({ id: identity.id, name: identity.name, email: identity.email });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  // Don't delete the demo user
  const identity = await prisma.identity.findUnique({ where: { id } });
  if (identity?.email === 'demo@grid.app') {
    return Response.json({ error: 'Cannot remove primary account' }, { status: 403 });
  }

  await prisma.identity.delete({ where: { id } });
  return Response.json({ deleted: true });
}
