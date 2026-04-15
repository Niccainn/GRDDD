import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  // Get user's environments for scoping
  const envMemberships = await prisma.environmentMembership.findMany({
    where: { identityId: identity.id },
    select: { environmentId: true },
  });
  const envIds = envMemberships.map((m) => m.environmentId);

  const [
    workflows,
    executions,
    goals,
    recentActivity,
    recentExecutions,
  ] = await Promise.all([
    prisma.workflow.findMany({
      where: { system: { environmentId: { in: envIds } } },
      select: { id: true, status: true },
    }),
    prisma.execution.findMany({
      where: { system: { environmentId: { in: envIds } } },
      select: { id: true, status: true, createdAt: true },
    }),
    prisma.goal.findMany({
      where: { environmentId: { in: envIds } },
      select: { id: true, status: true, progress: true },
    }),
    prisma.intelligenceLog.findMany({
      where: { action: 'nova_query' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        action: true,
        createdAt: true,
        system: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.execution.findMany({
      where: { system: { environmentId: { in: envIds } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        status: true,
        input: true,
        createdAt: true,
        completedAt: true,
        system: { select: { id: true, name: true, color: true } },
        workflow: { select: { id: true, name: true } },
      },
    }),
  ]);

  const totalWorkflows = workflows.length;
  const activeWorkflows = workflows.filter((w) => w.status === 'ACTIVE').length;

  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter((e) => e.status === 'COMPLETED').length;
  const failedExecutions = executions.filter((e) => e.status === 'FAILED').length;
  const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === 'COMPLETED').length;
  const avgGoalProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + (g.progress ?? 0), 0) / goals.length)
    : 0;

  // Build execution histogram (last 7 days)
  const now = Date.now();
  const executionsByDay: number[] = Array.from({ length: 7 }, () => 0);
  executions.forEach((e) => {
    const dayIdx = 6 - Math.min(Math.floor((now - new Date(e.createdAt).getTime()) / 86400000), 6);
    if (dayIdx >= 0) executionsByDay[dayIdx]++;
  });

  return Response.json({
    totalTasks: totalExecutions,
    completedTasks: successfulExecutions,
    activeTasks: executions.filter((e) => e.status === 'RUNNING').length,
    failedTasks: failedExecutions,
    totalWorkflows,
    activeWorkflows,
    totalExecutions,
    successRate,
    totalGoals,
    completedGoals,
    goalProgress: avgGoalProgress,
    recentActivityCount: recentActivity.length,
    executionsByDay,
    recentExecutions: recentExecutions.map((e) => ({
      id: e.id,
      status: e.status,
      input: e.input?.slice(0, 100) ?? '',
      createdAt: e.createdAt.toISOString(),
      completedAt: e.completedAt?.toISOString() ?? null,
      systemName: e.system.name,
      systemColor: e.system.color,
      workflowName: e.workflow?.name ?? null,
    })),
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      createdAt: a.createdAt.toISOString(),
      systemName: a.system?.name ?? 'System',
      systemColor: a.system?.color ?? null,
    })),
  });
}
