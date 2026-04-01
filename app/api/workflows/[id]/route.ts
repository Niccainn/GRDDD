import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

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
  const existing = await prisma.workflow.findUnique({ where: { id }, select: { name: true, status: true, environmentId: true } });
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
  // Audit status change
  if (body.status && existing && body.status !== existing.status) {
    audit({
      action: 'workflow.status_changed',
      entity: 'Workflow',
      entityId: id,
      entityName: existing.name,
      before: { status: existing.status },
      after:  { status: body.status },
      environmentId: existing.environmentId,
    });
  } else if (body.name || body.description || body.stages) {
    audit({
      action: 'workflow.updated',
      entity: 'Workflow',
      entityId: id,
      entityName: body.name ?? existing?.name,
      environmentId: existing?.environmentId,
    });
  }
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.workflow.delete({ where: { id } });
  return Response.json({ deleted: true });
}
