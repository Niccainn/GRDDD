import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const view = await prisma.savedView.findFirst({
    where: { id, OR: [{ creatorId: identity.id }, { isShared: true }] },
  });
  if (!view) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json(view);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const body = await req.json();

  const view = await prisma.savedView.findFirst({
    where: { id, creatorId: identity.id },
  });
  if (!view) return Response.json({ error: 'Not found or not owner' }, { status: 404 });

  const updated = await prisma.savedView.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.viewType !== undefined && { viewType: body.viewType }),
      ...(body.config !== undefined && { config: typeof body.config === 'string' ? body.config : JSON.stringify(body.config) }),
      ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      ...(body.isShared !== undefined && { isShared: body.isShared }),
    },
  });

  return Response.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const view = await prisma.savedView.findFirst({
    where: { id, creatorId: identity.id },
  });
  if (!view) return Response.json({ error: 'Not found or not owner' }, { status: 404 });

  await prisma.savedView.delete({ where: { id } });
  return Response.json({ ok: true });
}
