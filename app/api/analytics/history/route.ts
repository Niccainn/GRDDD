import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

type TimelineEvent = {
  id: string;
  type: 'goal_achieved' | 'goal_missed' | 'workflow_milestone' | 'health_change' | 'nova_insight' | 'task_milestone' | 'team_change';
  title: string;
  description: string;
  timestamp: string;
  metric?: string;
};

function getRangeDate(range: string): Date {
  const now = new Date();
  switch (range) {
    case '7d':  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:    return new Date('2020-01-01');
  }
}

function weekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const range = req.nextUrl.searchParams.get('range') ?? '30d';
  const since = getRangeDate(range);

  const envFilter = { environment: { ownerId: identity.id, deletedAt: null } };

  // ── Parallel queries ────────────────────────────────────────────────
  const [goals, executions, tasks, novaLogs, systems] = await Promise.all([
    prisma.goal.findMany({
      where: { ...envFilter, updatedAt: { gte: since } },
      select: { id: true, title: true, status: true, metric: true, target: true, current: true, updatedAt: true, system: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.execution.findMany({
      where: { system: envFilter, createdAt: { gte: since } },
      select: { id: true, status: true, createdAt: true, completedAt: true, workflow: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.findMany({
      where: { ...envFilter, deletedAt: null, updatedAt: { gte: since } },
      select: { id: true, title: true, status: true, createdAt: true, completedAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.intelligenceLog.findMany({
      where: { intelligence: envFilter, createdAt: { gte: since }, action: 'nova_query' },
      select: { id: true, createdAt: true, tokens: true, success: true, action: true, system: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.system.findMany({
      where: envFilter,
      select: { id: true, name: true, healthScore: true, systemState: { select: { healthScore: true, updatedAt: true } } },
    }),
  ]);

  // ── Build timeline events ──────────────────────────────────────────
  const timeline: TimelineEvent[] = [];

  // Goal events
  for (const g of goals) {
    if (g.status === 'ACHIEVED' || g.status === 'COMPLETED') {
      timeline.push({
        id: `goal-${g.id}`,
        type: 'goal_achieved',
        title: g.title,
        description: `Goal achieved in ${g.system?.name ?? 'system'}`,
        timestamp: g.updatedAt.toISOString(),
        metric: g.current && g.target ? `${g.current} / ${g.target}` : undefined,
      });
    } else if (g.status === 'AT_RISK' || g.status === 'MISSED' || g.status === 'BLOCKED') {
      timeline.push({
        id: `goal-${g.id}`,
        type: 'goal_missed',
        title: g.title,
        description: `Goal ${g.status.toLowerCase().replace('_', ' ')} in ${g.system?.name ?? 'system'}`,
        timestamp: g.updatedAt.toISOString(),
        metric: g.current && g.target ? `${g.current} / ${g.target}` : undefined,
      });
    }
  }

  // Workflow milestone events (completed executions)
  for (const e of executions) {
    if (e.status === 'COMPLETED' && e.workflow) {
      timeline.push({
        id: `exec-${e.id}`,
        type: 'workflow_milestone',
        title: `${e.workflow.name} completed`,
        description: 'Workflow execution finished successfully',
        timestamp: (e.completedAt ?? e.createdAt).toISOString(),
      });
    }
  }

  // System health events
  for (const s of systems) {
    if (s.systemState?.healthScore != null) {
      const score = s.systemState.healthScore;
      const severity = score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : 'critical';
      timeline.push({
        id: `health-${s.id}`,
        type: 'health_change',
        title: `${s.name}: ${severity}`,
        description: `System health at ${Math.round(score)}%`,
        timestamp: s.systemState.updatedAt.toISOString(),
        metric: `${Math.round(score)}%`,
      });
    }
  }

  // Nova insight events (group by day to avoid flooding)
  const novaByDay: Record<string, { count: number; tokens: number; date: string; systems: Set<string> }> = {};
  for (const log of novaLogs) {
    const day = log.createdAt.toISOString().slice(0, 10);
    if (!novaByDay[day]) novaByDay[day] = { count: 0, tokens: 0, date: day, systems: new Set() };
    novaByDay[day].count++;
    novaByDay[day].tokens += log.tokens ?? 0;
    if (log.system?.name) novaByDay[day].systems.add(log.system.name);
  }
  for (const [, day] of Object.entries(novaByDay)) {
    timeline.push({
      id: `nova-${day.date}`,
      type: 'nova_insight',
      title: `${day.count} Nova interaction${day.count !== 1 ? 's' : ''}`,
      description: day.systems.size > 0 ? `Across ${[...day.systems].slice(0, 3).join(', ')}` : 'AI-powered analysis',
      timestamp: `${day.date}T12:00:00.000Z`,
      metric: `${day.tokens.toLocaleString()} tokens`,
    });
  }

  // Task milestone events (completed tasks)
  const completedTasks = tasks.filter(t => t.status === 'DONE' && t.completedAt);
  // Group by day
  const tasksByDay: Record<string, { count: number; date: string; titles: string[] }> = {};
  for (const t of completedTasks) {
    const day = (t.completedAt ?? t.updatedAt).toISOString().slice(0, 10);
    if (!tasksByDay[day]) tasksByDay[day] = { count: 0, date: day, titles: [] };
    tasksByDay[day].count++;
    if (tasksByDay[day].titles.length < 3) tasksByDay[day].titles.push(t.title);
  }
  for (const [, day] of Object.entries(tasksByDay)) {
    timeline.push({
      id: `tasks-${day.date}`,
      type: 'task_milestone',
      title: `${day.count} task${day.count !== 1 ? 's' : ''} completed`,
      description: day.titles.join(', '),
      timestamp: `${day.date}T12:00:00.000Z`,
      metric: `${day.count}`,
    });
  }

  // Sort timeline by timestamp descending
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // ── Trend data ─────────────────────────────────────────────────────

  // Health over time — use system health scores as current snapshot
  // Since SystemState only stores current values, we derive a synthetic trend
  // from executions success rate by week as a proxy
  const weekMap = new Map<string, { total: number; success: number }>();
  for (const e of executions) {
    const wk = weekKey(e.createdAt);
    const entry = weekMap.get(wk) ?? { total: 0, success: 0 };
    entry.total++;
    if (e.status === 'COMPLETED') entry.success++;
    weekMap.set(wk, entry);
  }
  const healthTrend = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      value: v.total > 0 ? Math.round((v.success / v.total) * 100) : 100,
    }));

  // If we have actual system health scores, add current as latest point
  const avgHealth = systems.reduce((sum, s) => sum + (s.healthScore ?? s.systemState?.healthScore ?? 0), 0);
  const healthCount = systems.filter(s => s.healthScore != null || s.systemState?.healthScore != null).length;
  if (healthCount > 0 && healthTrend.length > 0) {
    healthTrend[healthTrend.length - 1].value = Math.round(avgHealth / healthCount);
  }

  // Task velocity — tasks completed per week
  const taskWeekMap = new Map<string, number>();
  for (const t of completedTasks) {
    const wk = weekKey(t.completedAt ?? t.updatedAt);
    taskWeekMap.set(wk, (taskWeekMap.get(wk) ?? 0) + 1);
  }
  const taskVelocity = [...taskWeekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  // AI usage — Nova interactions per week
  const aiWeekMap = new Map<string, number>();
  for (const log of novaLogs) {
    const wk = weekKey(log.createdAt);
    aiWeekMap.set(wk, (aiWeekMap.get(wk) ?? 0) + 1);
  }
  const aiUsage = [...aiWeekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  return Response.json({
    timeline: timeline.slice(0, 100),
    healthTrend,
    taskVelocity,
    aiUsage,
  });
}
