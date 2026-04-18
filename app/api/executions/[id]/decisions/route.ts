import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const body = await req.json();
  const { decisions } = body;

  if (!Array.isArray(decisions) || decisions.length === 0) {
    return Response.json({ error: 'decisions must be a non-empty array' }, { status: 400 });
  }

  // Fetch execution with access check
  const execution = await prisma.execution.findUnique({
    where: { id },
    include: { system: { select: { environmentId: true } }, workflow: { select: { id: true } } },
  });
  if (!execution) return Response.json({ error: 'Execution not found' }, { status: 404 });

  const environmentId = execution.system.environmentId;
  const env = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const validImpacts = ['high', 'medium', 'low'];

  const created = await prisma.decisionPoint.createMany({
    data: decisions.map((d: { stageId: string; stageName: string; decision: string; reasoning?: string; impact?: string; alternatives?: string[] }) => ({
      stageId: d.stageId,
      stageName: d.stageName,
      decision: d.decision,
      reasoning: d.reasoning ?? null,
      impact: validImpacts.includes(d.impact || '') ? d.impact! : 'medium',
      alternatives: d.alternatives ? JSON.stringify(d.alternatives) : null,
      executionId: id,
      workflowId: execution.workflowId || '',
      environmentId,
    })),
  });

  return Response.json({ created: created.count }, { status: 201 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const execution = await prisma.execution.findUnique({
    where: { id },
    include: { system: { select: { environmentId: true } } },
  });
  if (!execution) return Response.json({ error: 'Not found' }, { status: 404 });

  const env = await prisma.environment.findFirst({
    where: {
      id: execution.system.environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const decisions = await prisma.decisionPoint.findMany({
    where: { executionId: id },
    orderBy: { createdAt: 'asc' },
  });

  return Response.json(decisions.map(d => ({
    ...d,
    alternatives: d.alternatives ? JSON.parse(d.alternatives) : null,
  })));
}
