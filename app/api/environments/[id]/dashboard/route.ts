import { getAuthIdentity } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  // Find environment by id or slug — scoped to the authenticated user
  const environment = await prisma.environment.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      ownerId: identity.id,
      deletedAt: null,
    },
    include: { owner: { select: { name: true } } },
  });

  if (!environment) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const [systems, executions, goals, signals, novaLogs] = await Promise.all([
    // Systems with health
    prisma.system.findMany({
      where: { environmentId: environment.id, deletedAt: null },
      select: {
        id: true, name: true, color: true, healthScore: true, description: true,
        _count: { select: { workflows: true, executions: true } },
        workflows: { where: { status: 'ACTIVE' }, select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),

    // Recent executions
    prisma.execution.findMany({
      where: { system: { environmentId: environment.id } },
      include: {
        system: { select: { id: true, name: true, color: true } },
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),

    // Goals
    prisma.goal.findMany({
      where: { environmentId: environment.id },
      include: { system: { select: { name: true, color: true } } },
      orderBy: { status: 'asc' },
    }),

    // Signals
    prisma.signal.findMany({
      where: { environmentId: environment.id },
      include: { system: { select: { name: true, color: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    // Nova activity
    prisma.intelligenceLog.findMany({
      where: {
        action: 'nova_query',
        system: { environmentId: environment.id },
      },
      include: { system: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  // Compute campaign analytics from execution data
  const completedExecs = executions.filter(e => e.status === 'COMPLETED');
  const failedExecs = executions.filter(e => e.status === 'FAILED');
  const runningExecs = executions.filter(e => e.status === 'RUNNING');
  const successRate = completedExecs.length + failedExecs.length > 0
    ? completedExecs.length / (completedExecs.length + failedExecs.length)
    : 1;

  // Mock campaign metrics derived from real execution data
  const campaignAnalytics = {
    impressions: completedExecs.length * 3240 + runningExecs.length * 890,
    reach: completedExecs.length * 2180 + runningExecs.length * 540,
    engagement: completedExecs.length * 412 + runningExecs.length * 67,
    engagementRate: completedExecs.length > 0 ? 4.2 + Math.random() * 2 : 0,
    clicks: completedExecs.length * 186 + runningExecs.length * 23,
    ctr: completedExecs.length > 0 ? 2.1 + Math.random() * 1.5 : 0,
    spend: completedExecs.length * 42.5 + runningExecs.length * 12.0,
    roas: completedExecs.length > 0 ? 2.8 + Math.random() * 1.2 : 0,
    conversions: completedExecs.length * 18,
  };

  const avgHealth = systems.length > 0
    ? Math.round(systems.reduce((s, sys) => s + (sys.healthScore ?? 0), 0) / systems.length)
    : null;

  return Response.json({
    environment: {
      id: environment.id,
      name: environment.name,
      slug: environment.slug,
      description: environment.description,
      color: environment.color,
      owner: environment.owner.name,
      createdAt: environment.createdAt.toISOString(),
    },
    systems: systems.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color,
      healthScore: s.healthScore,
      description: s.description,
      workflows: s._count.workflows,
      activeWorkflows: s.workflows.length,
      executions: s._count.executions,
    })),
    executions: executions.map(e => ({
      id: e.id,
      status: e.status,
      input: e.input,
      createdAt: e.createdAt.toISOString(),
      completedAt: e.completedAt?.toISOString() ?? null,
      systemName: e.system.name,
      systemColor: e.system.color,
      workflowName: e.workflow?.name ?? null,
    })),
    goals: goals.map(g => ({
      id: g.id,
      title: g.title,
      status: g.status,
      progress: g.progress,
      target: g.target,
      current: g.current,
      metric: g.metric,
      dueDate: g.dueDate?.toISOString() ?? null,
      systemName: g.system.name,
      systemColor: g.system.color,
    })),
    signals: signals.map(s => ({
      id: s.id,
      title: s.title,
      body: s.body,
      source: s.source,
      priority: s.priority,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      systemName: s.system?.name ?? null,
    })),
    novaLogs: novaLogs.map(l => ({
      id: l.id,
      input: l.input,
      output: l.output,
      tokens: l.tokens,
      createdAt: l.createdAt.toISOString(),
      systemName: l.system?.name ?? null,
      systemColor: l.system?.color ?? null,
    })),
    avgHealth,
    successRate: Math.round(successRate * 100),
    campaignAnalytics,
  });
}
