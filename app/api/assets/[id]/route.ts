import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { deleteFile } from '@/lib/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;

  const asset = await prisma.asset.findFirst({
    where: { id, identityId: identity.id },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        include: {
          identity: { select: { id: true, name: true } },
        },
      },
      environment: { select: { id: true, name: true } },
      identity: { select: { id: true, name: true } },
      _count: { select: { versions: true } },
    },
  });

  if (!asset) {
    return Response.json({ error: 'Asset not found' }, { status: 404 });
  }

  return Response.json(asset);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;

  const asset = await prisma.asset.findFirst({
    where: { id, identityId: identity.id },
  });
  if (!asset) {
    return Response.json({ error: 'Asset not found' }, { status: 404 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.category !== undefined) data.category = body.category;
  if (body.tags !== undefined) {
    data.tags = Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags;
  }

  const updated = await prisma.asset.update({
    where: { id },
    data,
  });

  return Response.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;

  const asset = await prisma.asset.findFirst({
    where: { id, identityId: identity.id },
    include: { versions: true },
  });
  if (!asset) {
    return Response.json({ error: 'Asset not found' }, { status: 404 });
  }

  // Delete all version files + records
  for (const ver of asset.versions) {
    await deleteFile(ver.path);
    await prisma.asset.delete({ where: { id: ver.id } });
  }

  // Delete main asset file + record
  await deleteFile(asset.path);
  await prisma.asset.delete({ where: { id } });

  return Response.json({ ok: true });
}
