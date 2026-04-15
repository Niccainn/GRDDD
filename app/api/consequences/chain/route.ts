import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

type ChainNode = {
  id: string;
  type: string;
  entityId: string;
  label: string;
  relationship: string;
  impact: string;
  lagTime: string | null;
  description: string | null;
  confidence: number;
  children: ChainNode[];
};

async function traceChain(
  environmentId: string,
  sourceType: string,
  sourceId: string,
  depth: number,
  visited: Set<string>,
): Promise<ChainNode[]> {
  if (depth <= 0) return [];

  const links = await prisma.consequenceLink.findMany({
    where: { environmentId, sourceType, sourceId },
  });

  const children: ChainNode[] = [];

  for (const link of links) {
    const key = `${link.targetType}:${link.targetId}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const grandChildren = await traceChain(
      environmentId,
      link.targetType,
      link.targetId,
      depth - 1,
      visited,
    );

    children.push({
      id: link.id,
      type: link.targetType,
      entityId: link.targetId,
      label: link.targetLabel,
      relationship: link.relationship,
      impact: link.impact,
      lagTime: link.lagTime,
      description: link.description,
      confidence: link.confidence,
      children: grandChildren,
    });
  }

  return children;
}

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const sourceType = searchParams.get('sourceType');
  const sourceId = searchParams.get('sourceId');
  const environmentId = searchParams.get('environmentId');

  if (!sourceType || !sourceId || !environmentId) {
    return Response.json({ error: 'sourceType, sourceId, and environmentId are required' }, { status: 400 });
  }

  // Verify ownership
  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
  });
  if (!env) {
    return Response.json({ error: 'Environment not found' }, { status: 404 });
  }

  // Find the source label from any link that references it
  const sourceLink = await prisma.consequenceLink.findFirst({
    where: { environmentId, sourceType, sourceId },
  });

  const visited = new Set<string>([`${sourceType}:${sourceId}`]);
  const chain = await traceChain(environmentId, sourceType, sourceId, 5, visited);

  return Response.json({
    source: {
      type: sourceType,
      entityId: sourceId,
      label: sourceLink?.sourceLabel ?? sourceId,
    },
    chain,
    depth: getMaxDepth(chain),
    totalNodes: countNodes(chain),
  });
}

function getMaxDepth(nodes: ChainNode[]): number {
  if (nodes.length === 0) return 0;
  return 1 + Math.max(...nodes.map(n => getMaxDepth(n.children)));
}

function countNodes(nodes: ChainNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0);
}
