import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Verify the caller owns or is a member of the system's environment,
 * AND that the docId belongs to that system.
 */
async function assertAccess(identityId: string, systemId: string, docId: string) {
  const doc = await prisma.intelligence.findFirst({
    where: {
      id: docId,
      systemId,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identityId },
          { memberships: { some: { identityId } } },
        ],
      },
    },
  });
  return doc;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id, docId } = await params;
  const existing = await assertAccess(identity.id, id, docId);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const { title, body } = await req.json();

  const doc = await prisma.intelligence.update({
    where: { id: docId },
    data: {
      ...(title ? { name: title.trim() } : {}),
      ...(body !== undefined ? { metadata: JSON.stringify({ body: body.trim() }) } : {}),
    },
  });

  return Response.json({
    id: doc.id,
    title: doc.name,
    body: (() => { try { return JSON.parse(doc.metadata ?? '{}').body ?? ''; } catch { return ''; } })(),
    updatedAt: doc.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id, docId } = await params;
  const existing = await assertAccess(identity.id, id, docId);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  await prisma.intelligence.delete({ where: { id: docId } });
  return Response.json({ deleted: true });
}
