import { prisma } from '@/lib/db';
import { fireWebhooks } from '@/lib/webhooks';
import { audit } from '@/lib/audit';

/**
 * POST /api/alerts/fire
 * Evaluates current alerts and fires webhook notifications for critical/warning ones.
 * This can be called from a cron, from the alerts UI, or after health score updates.
 */
export async function POST() {
  const [systems, runningExecutions] = await Promise.all([
    prisma.system.findMany({
      where: { healthScore: { not: null } },
      include: { systemState: true, environment: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.execution.findMany({
      where: {
        status: 'RUNNING',
        createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      include: {
        system: { select: { id: true, name: true, environmentId: true } },
        workflow: { select: { id: true, name: true } },
      },
      take: 10,
    }),
  ]);

  const fired: string[] = [];

  // Health drift alerts
  for (const s of systems) {
    const score = s.systemState?.healthScore ?? (s.healthScore ? s.healthScore * 100 : null);
    if (score === null) continue;

    if (score < 50) {
      await fireWebhooks('alert.critical', {
        alertType: 'health_drift',
        systemId: s.id,
        systemName: s.name,
        healthScore: Math.round(score),
        message: `${s.name} health score is critical at ${Math.round(score)}%`,
        href: `/systems/${s.id}`,
      }, s.environmentId).catch(() => {});

      audit({
        action: 'alert.fired',
        entity: 'System',
        entityId: s.id,
        entityName: s.name,
        metadata: { severity: 'critical', score: Math.round(score), alertType: 'health_drift' },
        environmentId: s.environmentId,
        environmentName: s.environment.name,
      });

      fired.push(`critical:health:${s.id}`);
    } else if (score < 70) {
      await fireWebhooks('alert.warning', {
        alertType: 'health_drift',
        systemId: s.id,
        systemName: s.name,
        healthScore: Math.round(score),
        message: `${s.name} health score is drifting at ${Math.round(score)}%`,
        href: `/systems/${s.id}`,
      }, s.environmentId).catch(() => {});

      fired.push(`warning:health:${s.id}`);
    }
  }

  // Stalled execution alerts
  for (const e of runningExecutions) {
    const ageMin = Math.floor((Date.now() - new Date(e.createdAt).getTime()) / 60000);

    await fireWebhooks('alert.warning', {
      alertType: 'stalled_execution',
      executionId: e.id,
      systemId: e.system.id,
      systemName: e.system.name,
      workflowId: e.workflow?.id ?? null,
      workflowName: e.workflow?.name ?? null,
      ageMinutes: ageMin,
      message: `Execution in ${e.system.name} stalled after ${ageMin} minutes`,
    }, e.system.environmentId).catch(() => {});

    fired.push(`warning:stalled:${e.id}`);
  }

  return Response.json({ fired: fired.length, alerts: fired });
}
