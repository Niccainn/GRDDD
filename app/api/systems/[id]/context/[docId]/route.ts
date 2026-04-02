import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { docId } = await params;
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
  const { docId } = await params;
  await prisma.intelligence.delete({ where: { id: docId } });
  return Response.json({ deleted: true });
}
