import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.execution.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.currentStage !== undefined && { currentStage: body.currentStage }),
      ...(body.output !== undefined && { output: body.output }),
      ...(body.status === 'COMPLETED' && { completedAt: new Date() }),
    },
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.execution.delete({ where: { id } });
  return Response.json({ deleted: true });
}
