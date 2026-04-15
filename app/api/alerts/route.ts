import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const [systems, runningExecutions, stalledWorkflows] = await Promise.all([
    prisma.system.findMany({
      where: {
        environment: { ownerId: identity.id, deletedAt: null },
        healthScore: { not: null },
      },
      include: { systemState: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.execution.findMany({
      where: {
        system: { environment: { ownerId: identity.id, deletedAt: null } },
        status: 'RUNNING',
        createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) }, // > 30 min old
      },
      include: {
        system: { select: { id: true, name: true } },
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
    }),
    prisma.workflow.findMany({
      where: {
        environment: { ownerId: identity.id, deletedAt: null },
        status: 'PAUSED',
      },
      include: { system: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'asc' },
      take: 10,
    }),
  ]);

  const alerts: {
    id: string;
    type: 'health_drift' | 'stalled_execution' | 'paused_workflow';
    severity: 'warning' | 'critical';
    title: string;
    detail: string;
    href: string;
    createdAt: string;
  }[] = [];

  // Health drift alerts
  for (const s of systems) {
    const score = s.systemState?.healthScore ?? s.healthScore ?? null;
    if (score === null) continue;
    if (score < 50) {
      alerts.push({
        id: `health-${s.id}`,
        type: 'health_drift',
        severity: 'critical',
        title: `${s.name} is critical`,
        detail: `Health score ${Math.round(score)}% — immediate attention needed`,
        href: `/systems/${s.id}`,
        createdAt: s.updatedAt.toISOString(),
      });
    } else if (score < 70) {
      alerts.push({
        id: `health-${s.id}`,
        type: 'health_drift',
        severity: 'warning',
        title: `${s.name} is drifting`,
        detail: `Health score ${Math.round(score)}% — below healthy threshold`,
        href: `/systems/${s.id}`,
        createdAt: s.updatedAt.toISOString(),
      });
    }
  }

  // Stalled executions
  for (const e of runningExecutions) {
    const age = Math.floor((Date.now() - new Date(e.createdAt).getTime()) / 60000);
    alerts.push({
      id: `exec-${e.id}`,
      type: 'stalled_execution',
      severity: 'warning',
      title: `Stalled run in ${e.system.name}`,
      detail: `${e.workflow?.name ?? 'Execution'} has been running for ${age}m`,
      href: e.workflow ? `/workflows/${e.workflow.id}` : `/systems/${e.system.id}`,
      createdAt: e.createdAt.toISOString(),
    });
  }

  // Paused workflows
  for (const w of stalledWorkflows) {
    alerts.push({
      id: `wf-${w.id}`,
      type: 'paused_workflow',
      severity: 'warning',
      title: `${w.name} is paused`,
      detail: `In ${w.system.name} — may need attention`,
      href: `/workflows/${w.id}`,
      createdAt: w.updatedAt.toISOString(),
    });
  }

  // Sort by severity then recency
  alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return Response.json({ alerts, count: alerts.length });
}
