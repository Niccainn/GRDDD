/**
 * GET /api/v1/systems — list systems accessible by this API key.
 *
 * If the key is scoped to an environment, returns only that environment's systems.
 * If the key is scoped to an identity, returns all systems owned by that identity.
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateApiKey } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const apiKey = await authenticateApiKey(req);

  const where: Record<string, unknown> = {};
  if (apiKey.environmentId) {
    where.environmentId = apiKey.environmentId;
    where.deletedAt = null;
  } else if (apiKey.identityId) {
    where.environment = { ownerId: apiKey.identityId, deletedAt: null };
    where.deletedAt = null;
  } else {
    return Response.json({ error: 'API key has no scope' }, { status: 403 });
  }

  const systems = await prisma.system.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      icon: true,
      healthScore: true,
      environmentId: true,
      createdAt: true,
      _count: { select: { workflows: true, executions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({
    systems: systems.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      color: s.color,
      icon: s.icon,
      healthScore: s.healthScore,
      environmentId: s.environmentId,
      workflowCount: s._count.workflows,
      executionCount: s._count.executions,
      createdAt: s.createdAt,
    })),
  });
}
