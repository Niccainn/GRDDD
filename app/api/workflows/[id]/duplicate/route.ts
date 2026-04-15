import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsWorkflow } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsWorkflow(id, identity.id);

  const source = await prisma.workflow.findUnique({ where: { id } });
  if (!source) return Response.json({ error: 'Not found' }, { status: 404 });

  if (!identity) return Response.json({ error: 'No identity' }, { status: 500 });

  const copy = await prisma.workflow.create({
    data: {
      name: `${source.name} (copy)`,
      description: source.description,
      status: 'DRAFT',
      config: source.config,
      stages: source.stages,
      nodes: source.nodes,
      edges: source.edges,
      systemId: source.systemId,
      environmentId: source.environmentId,
      creatorId: identity.id,
    },
  });

  audit({
    action: 'workflow.created',
    entity: 'Workflow',
    entityId: copy.id,
    entityName: copy.name,
    metadata: { duplicatedFrom: source.id, duplicatedFromName: source.name },
    actorId: identity.id,
    actorName: identity.name,
    environmentId: source.environmentId,
  });

  return Response.json({ id: copy.id }, { status: 201 });
}
