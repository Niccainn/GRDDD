import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Tenant-scope a NovaMemory row to the caller. NovaMemory has no
 * Prisma relation to Environment in the schema — only an
 * `environmentId String?` column — so we resolve the caller's owned
 * env ids first and use an `in` filter. The previous implementation
 * did `findUnique({ where: { id }})` with no env scope, which
 * permitted cross-tenant tampering and deletion of other accounts'
 * memories.
 *
 * Global memories (environmentId null) belong to no tenant. They are
 * read-only for users; mutations require a real env match.
 *
 * 404-on-mismatch (never 403) keeps the existence side-channel closed.
 */
async function findOwnedMemory(memoryId: string, identityId: string) {
  const ownedEnvs = await prisma.environment.findMany({
    where: { ownerId: identityId, deletedAt: null },
    select: { id: true },
  });
  const ownedEnvIds = ownedEnvs.map(e => e.id);
  if (ownedEnvIds.length === 0) return null;
  return prisma.novaMemory.findFirst({
    where: {
      id: memoryId,
      isActive: true,
      environmentId: { in: ownedEnvIds },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const body = await req.json();
  const { title, content, type, category, confidence } = body;

  const existing = await findOwnedMemory(id, identity.id);
  if (!existing) {
    return Response.json({ error: 'Memory not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (content !== undefined) data.content = content;
  if (type !== undefined) data.type = type;
  if (category !== undefined) data.category = category;
  if (confidence !== undefined) data.confidence = confidence;

  const memory = await prisma.novaMemory.update({
    where: { id },
    data,
  });

  return Response.json({ memory });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;

  const existing = await findOwnedMemory(id, identity.id);
  if (!existing) {
    return Response.json({ error: 'Memory not found' }, { status: 404 });
  }

  await prisma.novaMemory.update({
    where: { id },
    data: { isActive: false },
  });

  return Response.json({ deleted: true });
}
