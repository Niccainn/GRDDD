import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { refreshAllHealthScores } from '@/lib/health';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  // Recompute health scores from real data (best-effort, non-blocking)
  refreshAllHealthScores().catch(() => {});

  const [systems, logs, workflows, recentExecutions] = await Promise.all([
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
    prisma.execution.findMany({
      include: {
        system: { select: { id: true, name: true, color: true } },
        workflow: { select: { id: true, name: true } },
        validationResult: { select: { score: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
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

  const executions = recentExecutions.map(e => ({
    id: e.id,
    status: e.status,
    input: e.input?.slice(0, 100) ?? '',
    createdAt: e.createdAt.toISOString(),
    completedAt: e.completedAt?.toISOString() ?? null,
    system: { id: e.system.id, name: e.system.name, color: e.system.color },
    workflow: e.workflow ? { id: e.workflow.id, name: e.workflow.name } : null,
    validationScore: e.validationResult?.score ?? null,
  }));

  // Greeting name — pulls the Display name field users set on the
  // /settings/profile page (Identity.name). If they never set one we
  // fall back to the email prefix so the greeting isn't awkwardly
  // cut off. `firstName` kept for backward-compat with older bundles
  // in-flight at deploy time.
  const displayName = (() => {
    const full = identity.name?.trim();
    if (full) return full;
    const email = identity.email?.trim();
    if (email && email.includes('@')) return email.split('@')[0];
    return null;
  })();
  const firstName = displayName ? displayName.split(/\s+/)[0] : null;

  return Response.json({
    systems: systemData,
    activity: activityFeed,
    workflows: wfStats,
    avgHealth,
    executions,
    user: {
      id: identity.id,
      name: identity.name,
      displayName,
      firstName,
      email: identity.email,
    },
  });
}
