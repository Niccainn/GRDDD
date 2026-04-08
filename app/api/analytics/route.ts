import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

  // ── Nova logs for the last 30 days ─────────────────────────────────────────
  const novaLogs = await prisma.intelligenceLog.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      action: 'nova_query',
    },
    select: {
      createdAt: true,
      tokens: true,
      cost: true,
      success: true,
      systemId: true,
      system: { select: { name: true, color: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // ── Execution stats for last 30 days ───────────────────────────────────────
  const executions = await prisma.execution.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: {
      createdAt: true,
      status: true,
      workflow: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // ── Token usage by system (all time) ──────────────────────────────────────
  const bySystemRaw = await prisma.intelligenceLog.groupBy({
    by: ['systemId'],
    where: { action: 'nova_query', tokens: { not: null } },
    _sum: { tokens: true, cost: true },
    _count: true,
    orderBy: { _sum: { tokens: 'desc' } },
    take: 10,
  });

  const systemNames: Record<string, { name: string; color: string | null }> = {};
  if (bySystemRaw.length > 0) {
    const systems = await prisma.system.findMany({
      where: { id: { in: bySystemRaw.map(s => s.systemId).filter(Boolean) as string[] } },
      select: { id: true, name: true, color: true },
    });
    systems.forEach(s => { systemNames[s.id] = { name: s.name, color: s.color }; });
  }

  const bySystem = bySystemRaw.map(s => ({
    systemId: s.systemId,
    name: s.systemId && systemNames[s.systemId] ? systemNames[s.systemId].name : 'Unknown',
    color: s.systemId && systemNames[s.systemId] ? systemNames[s.systemId].color : null,
    tokens: s._sum.tokens ?? 0,
    cost: s._sum.cost ?? 0,
    count: s._count,
  }));

  // ── Daily Nova activity (last 30 days) ────────────────────────────────────
  const dailyMap: Record<string, { date: string; queries: number; tokens: number }> = {};
  for (let d = 0; d < 30; d++) {
    const date = new Date(now.getTime() - (29 - d) * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    dailyMap[key] = { date: key, queries: 0, tokens: 0 };
  }
  novaLogs.forEach(log => {
    const key = log.createdAt.toISOString().slice(0, 10);
    if (dailyMap[key]) {
      dailyMap[key].queries++;
      dailyMap[key].tokens += log.tokens ?? 0;
    }
  });
  const daily = Object.values(dailyMap);

  // ── Daily execution stats (last 30 days) ──────────────────────────────────
  const execDailyMap: Record<string, { date: string; completed: number; failed: number }> = {};
  for (let d = 0; d < 30; d++) {
    const date = new Date(now.getTime() - (29 - d) * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    execDailyMap[key] = { date: key, completed: 0, failed: 0 };
  }
  executions.forEach(e => {
    const key = e.createdAt.toISOString().slice(0, 10);
    if (execDailyMap[key]) {
      if (e.status === 'COMPLETED') execDailyMap[key].completed++;
      else if (e.status === 'FAILED') execDailyMap[key].failed++;
    }
  });
  const execDaily = Object.values(execDailyMap);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalTokens = novaLogs.reduce((s, l) => s + (l.tokens ?? 0), 0);
  const totalCost   = novaLogs.reduce((s, l) => s + (l.cost ?? 0), 0);
  const totalQueries = novaLogs.length;
  const successRate = novaLogs.length > 0
    ? Math.round((novaLogs.filter(l => l.success).length / novaLogs.length) * 100)
    : 100;

  const weekTokens = novaLogs
    .filter(l => l.createdAt >= sevenDaysAgo)
    .reduce((s, l) => s + (l.tokens ?? 0), 0);
  const weekQueries = novaLogs.filter(l => l.createdAt >= sevenDaysAgo).length;

  const execCompleted = executions.filter(e => e.status === 'COMPLETED').length;
  const execFailed    = executions.filter(e => e.status === 'FAILED').length;
  const execTotal     = executions.length;
  const execSuccessRate = execTotal > 0 ? Math.round((execCompleted / execTotal) * 100) : 100;

  return Response.json({
    summary: {
      totalTokens,
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalQueries,
      successRate,
      weekTokens,
      weekQueries,
      execTotal,
      execCompleted,
      execFailed,
      execSuccessRate,
    },
    daily,
    execDaily,
    bySystem,
  });
}
