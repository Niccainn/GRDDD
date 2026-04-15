import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const template = await prisma.taskTemplate.findFirst({
    where: { id, OR: [{ creatorId: identity.id }, { isGlobal: true }] },
  });
  if (!template) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json(template);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const body = await req.json();

  const template = await prisma.taskTemplate.findFirst({
    where: { id, creatorId: identity.id },
  });
  if (!template) return Response.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.taskTemplate.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.templateData !== undefined && { templateData: typeof body.templateData === 'string' ? body.templateData : JSON.stringify(body.templateData) }),
      ...(body.category !== undefined && { category: body.category }),
    },
  });

  return Response.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const template = await prisma.taskTemplate.findFirst({
    where: { id, creatorId: identity.id },
  });
  if (!template) return Response.json({ error: 'Not found' }, { status: 404 });

  await prisma.taskTemplate.delete({ where: { id } });
  return Response.json({ ok: true });
}
