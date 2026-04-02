import { prisma } from '@/lib/db';

export async function GET() {
  const [systems, logs, workflows] = await Promise.all([
    prisma.system.findMany({
      include: {
        environment: true,
        systemState: true,
        _count: { select: { workflows: true, executions: true } },
        workflows: { where: { status: 'ACTIVE' }, select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.intelligenceLog.findMany({
      where: { action: 'nova_query' },
      include: { system: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.workflow.findMany({
      include: { system: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const systemData = systems.map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
    environmentName: s.environment.name,
    // healthScore stored as 0–100; systemState.healthScore also 0–100
    healthScore: s.systemState?.healthScore ?? s.healthScore ?? null,
    activeWorkflows: s.workflows.length,
    totalWorkflows: s._count.workflows,
    totalExecutions: s._count.executions,
    lastActivity: s.systemState?.lastActivity?.toISOString() ?? s.updatedAt.toISOString(),
  }));

  const activityFeed = logs.map(l => ({
    id: l.id,
    systemId: l.system?.id ?? null,
    systemName: l.system?.name ?? 'Unknown',
    systemColor: l.system?.color ?? null,
    query: (() => { try { return JSON.parse(l.input ?? '{}').query ?? l.input; } catch { return l.input ?? ''; } })(),
    response: (() => { try { return JSON.parse(l.output ?? '{}').response ?? ''; } catch { return l.output ?? ''; } })(),
    tokens: l.tokens,
    createdAt: l.createdAt.toISOString(),
  }));

  const wfStats = {
    total: workflows.length,
    active: workflows.filter(w => w.status === 'ACTIVE').length,
    draft: workflows.filter(w => w.status === 'DRAFT').length,
    paused: workflows.filter(w => w.status === 'PAUSED').length,
    stalled: workflows.filter(w => w.status === 'PAUSED').map(w => ({
      id: w.id,
      name: w.name,
      systemName: w.system.name,
    })),
  };

  const healthScores = systemData.filter(s => s.healthScore !== null);
  const avgHealth = healthScores.length
    ? Math.round(healthScores.reduce((sum, s) => sum + (s.healthScore ?? 0), 0) / healthScores.length)
    : null;

  return Response.json({ systems: systemData, activity: activityFeed, workflows: wfStats, avgHealth });
}
