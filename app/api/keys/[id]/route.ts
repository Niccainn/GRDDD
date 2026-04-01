import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const { id } = await params;
  await prisma.apiKey.delete({ where: { id } });
  return Response.json({ deleted: true });
}
