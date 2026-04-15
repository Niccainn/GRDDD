import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: {
      id,
      environment: { ownerId: identity.id, deletedAt: null },
    },
    include: {
      environment: { select: { id: true, name: true, slug: true, color: true } },
      children: {
        where: { isArchived: false },
        select: { id: true, title: true, icon: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      },
      parent: {
        select: { id: true, title: true, icon: true },
      },
    },
  });

  if (!doc) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  return Response.json(doc);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const body = await req.json();

  // Verify ownership
  const existing = await prisma.document.findFirst({
    where: {
      id,
      environment: { ownerId: identity.id, deletedAt: null },
    },
  });
  if (!existing) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.parentId !== undefined) updateData.parentId = body.parentId;
  if (body.isArchived !== undefined) updateData.isArchived = body.isArchived;
  if (body.coverImage !== undefined) updateData.coverImage = body.coverImage;

  const doc = await prisma.document.update({
    where: { id },
    data: updateData,
  });

  return Response.json(doc);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.document.findFirst({
    where: {
      id,
      environment: { ownerId: identity.id, deletedAt: null },
    },
  });
  if (!existing) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  // Soft delete
  await prisma.document.update({
    where: { id },
    data: { isArchived: true },
  });

  return Response.json({ success: true });
}
