import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsWorkflow } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsWorkflow(id, identity.id);
  const versions = await prisma.workflowVersion.findMany({
    where: { workflowId: id },
    orderBy: { version: 'desc' },
    take: 30,
  });
  return Response.json(versions.map(v => ({
    id: v.id,
    version: v.version,
    description: v.description,
    stages: JSON.parse(v.stages ?? '[]'),
    hasNodes: !!v.nodes,
    createdAt: v.createdAt.toISOString(),
  })));
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsWorkflow(id, identity.id);
  const workflow = await prisma.workflow.findUnique({
    where: { id },
    select: { stages: true, nodes: true, edges: true },
  });
  if (!workflow) return Response.json({ error: 'Not found' }, { status: 404 });

  const latest = await prisma.workflowVersion.findFirst({
    where: { workflowId: id },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const version = await prisma.workflowVersion.create({
    data: {
      workflowId: id,
      version: (latest?.version ?? 0) + 1,
      stages: workflow.stages,
      nodes: workflow.nodes,
      edges: workflow.edges,
    },
  });

  return Response.json({ id: version.id, version: version.version }, { status: 201 });
}
