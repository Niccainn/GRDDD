import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: { system: true, environment: true },
  });
  if (!workflow) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({
    id: workflow.id,
    name: workflow.name,
    description: workflow.description ?? null,
    status: workflow.status,
    stages: JSON.parse(workflow.stages ?? '[]'),
    nodes: workflow.nodes ?? null,
    edges: workflow.edges ?? null,
    systemName: workflow.system.name,
    environmentName: workflow.environment.name,
    systemId: workflow.systemId,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updated = await prisma.workflow.update({
    where: { id },
    data: {
      ...(body.name        !== undefined && { name:        body.name        }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status      !== undefined && { status:      body.status      }),
      ...(body.stages      !== undefined && { stages:      JSON.stringify(body.stages) }),
      ...(body.nodes       !== undefined && { nodes:       body.nodes       }),
      ...(body.edges       !== undefined && { edges:       body.edges       }),
    },
  });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.workflow.delete({ where: { id } });
  return Response.json({ deleted: true });
}
