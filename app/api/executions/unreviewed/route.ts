import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const { searchParams } = new URL(req.url);
  const environmentId = searchParams.get('environmentId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20);

  const where: Record<string, unknown> = {
    status: 'COMPLETED',
    review: null, // no review yet
    system: {
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id } } },
        ],
      },
    },
  };

  if (environmentId) {
    where.system = { ...where.system as object, environmentId };
  }

  const executions = await prisma.execution.findMany({
    where: where as any,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      input: true,
      createdAt: true,
      system: { select: { name: true, color: true } },
      workflow: { select: { id: true, name: true } },
    },
  });

  return Response.json({
    count: executions.length,
    executions: executions.map(e => ({
      id: e.id,
      inputPreview: e.input.slice(0, 100),
      systemName: e.system.name,
      systemColor: e.system.color,
      workflowName: e.workflow?.name || null,
      workflowId: e.workflow?.id || null,
      createdAt: e.createdAt,
    })),
  });
}
