import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsApiKey } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsApiKey(id, identity.id);
  const body = await req.json();
  const updated = await prisma.apiKey.update({
    where: { id },
    data: {
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.name     !== undefined && { name:     body.name.trim() }),
    },
  });
  return Response.json({ id: updated.id });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsApiKey(id, identity.id);
  await prisma.apiKey.delete({ where: { id } });
  return Response.json({ deleted: true });
}
