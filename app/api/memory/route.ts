/**
 * GET /api/memory — searchable institutional memory across the
 * Environments the caller can see.
 *
 * Query params:
 *   - q       optional full-text match against title + content
 *   - envId   scope to a single environment
 *   - days    recency window
 *   - limit   default 30, max 100
 *
 * Returns items from NovaMemory (what Nova has learned) plus
 * MasteryInsight (principles Nova has detected in workflow runs)
 * plus OperationalPlaybook summaries — a unified "what the
 * organization has learned" feed.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  const envId = req.nextUrl.searchParams.get('envId');
  const daysRaw = parseInt(req.nextUrl.searchParams.get('days') ?? '0', 10);
  const limitRaw = parseInt(req.nextUrl.searchParams.get('limit') ?? '30', 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 30, 1), 100);

  const visibleEnvs = await prisma.environment.findMany({
    where: {
      deletedAt: null,
      OR: [{ ownerId: identity.id }, { memberships: { some: { identityId: identity.id } } }],
      ...(envId ? { id: envId } : {}),
    },
    select: { id: true, name: true, color: true },
  });
  const envIds = visibleEnvs.map(e => e.id);
  if (envIds.length === 0) return Response.json({ items: [] });

  const sinceClause = daysRaw > 0 ? { gte: new Date(Date.now() - daysRaw * MS_PER_DAY) } : undefined;

  const [memories, insights] = await Promise.all([
    prisma.novaMemory.findMany({
      where: {
        deletedAt: null,
        OR: [
          { environmentId: { in: envIds } },
          // Global (unscoped) memories are also visible.
          { environmentId: null },
        ],
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { content: { contains: q } },
              ],
            }
          : {}),
        ...(sinceClause ? { updatedAt: sinceClause } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        category: true,
        title: true,
        content: true,
        source: true,
        confidence: true,
        environmentId: true,
        systemId: true,
        updatedAt: true,
      },
    }),
    prisma.masteryInsight.findMany({
      where: {
        environmentId: { in: envIds },
        ...(q ? { OR: [{ principle: { contains: q } }, { evidence: { contains: q } }] } : {}),
        ...(sinceClause ? { updatedAt: sinceClause } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(limit, 20),
      select: {
        id: true,
        principle: true,
        evidence: true,
        category: true,
        strength: true,
        runsAnalyzed: true,
        environmentId: true,
        updatedAt: true,
      },
    }),
  ]);

  const envMap = new Map(visibleEnvs.map(e => [e.id, e]));

  type Item = {
    id: string;
    source: 'memory' | 'insight';
    type: string;
    category: string | null;
    title: string;
    body: string;
    confidence: number;
    environmentName: string | null;
    environmentColor: string | null;
    updatedAt: string;
  };

  const items: Item[] = [];
  for (const m of memories) {
    const env = m.environmentId ? envMap.get(m.environmentId) : null;
    items.push({
      id: `memory:${m.id}`,
      source: 'memory',
      type: m.type,
      category: m.category,
      title: m.title,
      body: m.content,
      confidence: m.confidence,
      environmentName: env?.name ?? null,
      environmentColor: env?.color ?? null,
      updatedAt: m.updatedAt.toISOString(),
    });
  }
  for (const i of insights) {
    const env = envMap.get(i.environmentId);
    items.push({
      id: `insight:${i.id}`,
      source: 'insight',
      type: 'principle',
      category: i.category,
      title: i.principle,
      body: `${i.evidence}\n\nObserved across ${i.runsAnalyzed} run${i.runsAnalyzed === 1 ? '' : 's'}.`,
      confidence: i.strength,
      environmentName: env?.name ?? null,
      environmentColor: env?.color ?? null,
      updatedAt: i.updatedAt.toISOString(),
    });
  }

  items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return Response.json({ items: items.slice(0, limit) });
}
