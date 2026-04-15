import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

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

  const existing = await prisma.novaMemory.findUnique({ where: { id } });
  if (!existing || !existing.isActive) {
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

  const existing = await prisma.novaMemory.findUnique({ where: { id } });
  if (!existing || !existing.isActive) {
    return Response.json({ error: 'Memory not found' }, { status: 404 });
  }

  await prisma.novaMemory.update({
    where: { id },
    data: { isActive: false },
  });

  return Response.json({ deleted: true });
}
