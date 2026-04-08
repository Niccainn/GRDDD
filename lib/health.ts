import { prisma } from './db';

/**
 * Compute a real health score for a system based on actual operational data.
 *
 * Score = weighted average of:
 *   - Execution success rate (last 30 days): 40%
 *   - Workflow activity (has active workflows with recent runs): 20%
 *   - Goal progress (average across system goals): 20%
 *   - Signal responsiveness (triaged/total): 20%
 *
 * Returns 0-100. Returns null if no data exists to compute from.
 */
export async function computeHealthScore(systemId: string): Promise<number | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 1. Execution success rate (40%)
  const executions = await prisma.execution.findMany({
    where: { systemId, createdAt: { gte: thirtyDaysAgo } },
    select: { status: true },
  });

  let executionScore = 50; // default if no executions
  if (executions.length > 0) {
    const completed = executions.filter(e => e.status === 'COMPLETED').length;
    const failed = executions.filter(e => e.status === 'FAILED').length;
    const total = completed + failed;
    executionScore = total > 0 ? (completed / total) * 100 : 50;
  }

  // 2. Workflow activity (20%)
  const workflows = await prisma.workflow.findMany({
    where: { systemId, status: 'ACTIVE', deletedAt: null },
    select: { id: true },
  });

  let activityScore = 0;
  if (workflows.length > 0) {
    const recentRuns = await prisma.execution.count({
      where: {
        systemId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    // Active workflows with recent runs = healthy
    activityScore = recentRuns > 0 ? Math.min(100, 60 + recentRuns * 10) : 30;
  }

  // 3. Goal progress (20%)
  const goals = await prisma.goal.findMany({
    where: { systemId },
    select: { progress: true, status: true },
  });

  let goalScore = 50; // default if no goals
  if (goals.length > 0) {
    const avgProgress = goals.reduce((sum, g) => sum + (g.progress ?? 0), 0) / goals.length;
    const atRisk = goals.filter(g => g.status === 'AT_RISK').length;
    goalScore = Math.max(0, avgProgress * 100 - atRisk * 15);
  }

  // 4. Signal responsiveness (20%)
  const signals = await prisma.signal.findMany({
    where: { systemId, createdAt: { gte: thirtyDaysAgo } },
    select: { status: true },
  });

  let signalScore = 80; // default if no signals (no news is good news)
  if (signals.length > 0) {
    const handled = signals.filter(s => s.status !== 'UNREAD').length;
    signalScore = (handled / signals.length) * 100;
  }

  // Weighted average
  const health = Math.round(
    executionScore * 0.4 +
    activityScore * 0.2 +
    goalScore * 0.2 +
    signalScore * 0.2
  );

  // Clamp to 0-100
  return Math.max(0, Math.min(100, health));
}

/**
 * Recompute and persist health scores for all systems.
 * Call this after executions complete, goals update, or signals are triaged.
 */
export async function refreshAllHealthScores(): Promise<void> {
  const systems = await prisma.system.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  for (const sys of systems) {
    const score = await computeHealthScore(sys.id);
    if (score !== null) {
      await prisma.system.update({
        where: { id: sys.id },
        data: { healthScore: score },
      });
    }
  }
}
