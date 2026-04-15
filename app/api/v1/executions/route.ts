/**
 * GET /api/v1/executions — list recent executions.
 * Optional filters: ?systemId=, ?workflowId=, ?status=, ?limit= (max 100, default 20)
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateApiKey } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const apiKey = await authenticateApiKey(req);
  const { searchParams } = new URL(req.url);

  const systemId = searchParams.get('systemId');
  const workflowId = searchParams.get('workflowId');
  const status = searchParams.get('status');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 100);

  const where: Record<string, unknown> = {};

  if (systemId) where.systemId = systemId;
  if (workflowId) where.workflowId = workflowId;
  if (status) where.status = status.toUpperCase();

  // Scope by API key
  if (apiKey.environmentId) {
    where.system = { environmentId: apiKey.environmentId, deletedAt: null };
  } else if (apiKey.identityId) {
    where.system = { environment: { ownerId: apiKey.identityId, deletedAt: null } };
  } else {
    return Response.json({ error: 'API key has no scope' }, { status: 403 });
  }

  const executions = await prisma.execution.findMany({
    where,
    select: {
      id: true,
      status: true,
      input: true,
      output: true,
      currentStage: true,
      systemId: true,
      workflowId: true,
      createdAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return Response.json({
    executions: executions.map(e => ({
      id: e.id,
      status: e.status,
      input: e.input,
      output: e.output,
      currentStage: e.currentStage,
      systemId: e.systemId,
      workflowId: e.workflowId,
      createdAt: e.createdAt,
      completedAt: e.completedAt,
    })),
  });
}
