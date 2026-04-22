/**
 * GET /api/environments/[id]/roi
 *
 * CFO-ready rollup for one Environment:
 *   - Attributed value from Goals (sums through
 *     lib/finance/attribution)
 *   - Cost from IntelligenceLog.cost over the window (default 30d)
 *   - Ratio = value / cost
 *
 * Zero-migration: reads existing Goal + IntelligenceLog fields.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { estimateGoalValue } from '@/lib/finance/attribution';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id: envId } = await params;

  const env = await prisma.environment.findFirst({
    where: {
      id: envId,
      deletedAt: null,
      OR: [{ ownerId: identity.id }, { memberships: { some: { identityId: identity.id } } }],
    },
    select: { id: true },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const daysRaw = parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10);
  const days = Math.min(Math.max(Number.isFinite(daysRaw) ? daysRaw : 30, 1), 365);
  const since = new Date(Date.now() - days * MS_PER_DAY);

  const [goals, intelCostRows, executions] = await Promise.all([
    prisma.goal.findMany({
      where: { environmentId: envId },
      select: {
        id: true,
        title: true,
        metric: true,
        target: true,
        current: true,
        status: true,
        progress: true,
        systemId: true,
        system: { select: { name: true, color: true } },
      },
    }),
    // IntelligenceLog.cost is a Float; null-safe sum handled manually.
    prisma.intelligenceLog.findMany({
      where: {
        system: { environmentId: envId },
        createdAt: { gte: since },
      },
      select: { systemId: true, cost: true, tokens: true },
    }),
    prisma.execution.count({
      where: { system: { environmentId: envId }, createdAt: { gte: since } },
    }),
  ]);

  // Aggregate cost per system.
  const perSystem = new Map<string, { cost: number; tokens: number; calls: number }>();
  let totalCost = 0;
  let totalTokens = 0;
  for (const r of intelCostRows) {
    if (!r.systemId) continue;
    const slot = perSystem.get(r.systemId) ?? { cost: 0, tokens: 0, calls: 0 };
    slot.cost += r.cost ?? 0;
    slot.tokens += r.tokens ?? 0;
    slot.calls += 1;
    perSystem.set(r.systemId, slot);
    totalCost += r.cost ?? 0;
    totalTokens += r.tokens ?? 0;
  }

  // Attribute value per goal, then sum by system.
  const goalRows = goals.map(g => {
    const v = estimateGoalValue(g);
    return {
      id: g.id,
      title: g.title,
      metric: g.metric,
      current: g.current,
      target: g.target,
      status: g.status,
      progress: g.progress,
      systemId: g.systemId,
      systemName: g.system?.name ?? null,
      systemColor: g.system?.color ?? null,
      value: v,
    };
  });

  const perSystemValue = new Map<string, number>();
  let totalValue = 0;
  let attributedGoals = 0;
  let unattributedGoals = 0;
  for (const g of goalRows) {
    if (g.value.attributed) {
      attributedGoals++;
      totalValue += g.value.dollars;
      if (g.systemId) {
        perSystemValue.set(g.systemId, (perSystemValue.get(g.systemId) ?? 0) + g.value.dollars);
      }
    } else {
      unattributedGoals++;
    }
  }

  // System-level cost + value rollup.
  const systemIds = Array.from(new Set([...perSystem.keys(), ...perSystemValue.keys()]));
  const systems = await prisma.system.findMany({
    where: { id: { in: systemIds } },
    select: { id: true, name: true, color: true },
  });
  const systemMap = new Map(systems.map(s => [s.id, s]));

  const perSystemRows = systemIds.map(id => {
    const s = systemMap.get(id);
    const cost = perSystem.get(id)?.cost ?? 0;
    const value = perSystemValue.get(id) ?? 0;
    return {
      systemId: id,
      systemName: s?.name ?? 'Unknown',
      systemColor: s?.color ?? null,
      cost,
      tokens: perSystem.get(id)?.tokens ?? 0,
      calls: perSystem.get(id)?.calls ?? 0,
      attributedValue: value,
      ratio: cost > 0 ? value / cost : null,
    };
  });
  // Sort by ROI ratio desc, unroi'd last.
  perSystemRows.sort((a, b) => {
    if (a.ratio == null && b.ratio == null) return b.cost - a.cost;
    if (a.ratio == null) return 1;
    if (b.ratio == null) return -1;
    return b.ratio - a.ratio;
  });

  return Response.json({
    windowDays: days,
    generatedAt: new Date().toISOString(),
    totalValue,
    totalCost: Math.round(totalCost * 100) / 100,
    totalTokens,
    totalExecutions: executions,
    attributedGoals,
    unattributedGoals,
    ratio: totalCost > 0 ? Math.round((totalValue / totalCost) * 10) / 10 : null,
    perSystem: perSystemRows,
    goals: goalRows,
  });
}
