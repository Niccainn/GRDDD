/**
 * GET /api/v1/workflows — list workflows accessible by this API key.
 * Optional ?systemId= filter.
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateApiKey } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const apiKey = await authenticateApiKey(req);
  const { searchParams } = new URL(req.url);
  const systemId = searchParams.get('systemId');

  const where: Record<string, unknown> = { deletedAt: null };

  if (systemId) {
    where.systemId = systemId;
  }

  if (apiKey.environmentId) {
    where.environmentId = apiKey.environmentId;
  } else if (apiKey.identityId) {
    where.environment = { ownerId: apiKey.identityId, deletedAt: null };
  } else {
    return Response.json({ error: 'API key has no scope' }, { status: 403 });
  }

  const workflows = await prisma.workflow.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      stages: true,
      systemId: true,
      environmentId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { executions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({
    workflows: workflows.map(wf => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      status: wf.status,
      stages: wf.stages ? JSON.parse(wf.stages) : [],
      systemId: wf.systemId,
      environmentId: wf.environmentId,
      executionCount: wf._count.executions,
      createdAt: wf.createdAt,
      updatedAt: wf.updatedAt,
    })),
  });
}
