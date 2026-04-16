import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsWorkflow } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsWorkflow(id, identity.id);
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
    stages: (() => { try { const parsed = JSON.parse(workflow.stages ?? '[]'); return parsed.map((s: unknown) => typeof s === 'string' ? s : (s as { name?: string }).name ?? ''); } catch { return []; } })(),
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
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsWorkflow(id, identity.id);
  const body = await req.json();

  // Validate nodes and edges structure if provided
  if (body.nodes !== undefined && body.nodes !== null) {
    if (typeof body.nodes !== 'string') {
      return Response.json({ error: 'nodes must be a JSON string' }, { status: 400 });
    }
    try { JSON.parse(body.nodes); } catch {
      return Response.json({ error: 'nodes must be valid JSON' }, { status: 400 });
    }
  }
  if (body.edges !== undefined && body.edges !== null) {
    if (typeof body.edges !== 'string') {
      return Response.json({ error: 'edges must be a JSON string' }, { status: 400 });
    }
    try { JSON.parse(body.edges); } catch {
      return Response.json({ error: 'edges must be valid JSON' }, { status: 400 });
    }
  }

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
  // Auto-snapshot on structural changes
  if ((body.nodes !== undefined || body.edges !== undefined || body.stages !== undefined) && existing) {
    const latest = await prisma.workflowVersion.findFirst({
      where: { workflowId: id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    await prisma.workflowVersion.create({
      data: {
        workflowId: id,
        version: (latest?.version ?? 0) + 1,
        stages: updated.stages,
        nodes: updated.nodes ?? null,
        edges: updated.edges ?? null,
        description: body.nodes !== undefined ? 'Visual builder save' : 'Stage edit',
      },
    });
  }

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
  } else if (body.name || body.description || body.stages || body.nodes) {
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
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsWorkflow(id, identity.id);
  await prisma.workflow.delete({ where: { id } });
  return Response.json({ deleted: true });
}
