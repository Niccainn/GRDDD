/**
 * Cron resolver — build the list of (spec, context) pairs that the
 * scheduler tick should evaluate.
 *
 * In Phase 2 the marketplace is global (same specs for every tenant),
 * so the resolver walks every Identity that has opted into schedules
 * and pairs each active schedule-triggered spec with that tenant's
 * KernelContext. This is deliberately simple — one tenant, one
 * environment, one schedule list — and can be replaced with a
 * DB-backed per-tenant schedule table in Phase 3 without changing
 * the tick() contract.
 *
 * "Opted in" currently means: the tenant has at least one Environment,
 * which is the same gate the rest of the app uses to decide whether
 * a user is "active". This prevents us from firing scheduled work
 * for accounts that were created and never touched.
 */

import { prisma } from '../db';
import { listWorkflows, type WorkflowSpec } from './index';
import type { KernelContext } from '../kernel/types';

export interface ResolvedSchedule {
  spec: WorkflowSpec;
  context: KernelContext;
  defaultInput?: string;
}

/**
 * Walk active tenants × schedule-triggered specs and produce the list
 * the scheduler tick should evaluate.
 */
export async function resolveActiveSchedules(): Promise<ResolvedSchedule[]> {
  const scheduledSpecs = listWorkflows({ triggerType: 'schedule' });
  if (scheduledSpecs.length === 0) return [];

  // Pull every Identity that has at least one Environment.
  // This is our "activation" signal for MVP multi-tenancy.
  const tenants = await prisma.identity.findMany({
    where: {
      deletedAt: null,
      // Only fire for human-type identities — don't double-schedule
      // for service accounts or webhook surrogates.
      type: 'PERSON',
    },
    select: {
      id: true,
      ownedEnvironments: {
        select: { id: true },
        take: 1,
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const active = tenants.filter((t) => t.ownedEnvironments.length > 0);
  if (active.length === 0) return [];

  const out: ResolvedSchedule[] = [];
  for (const tenant of active) {
    const envId = tenant.ownedEnvironments[0].id;
    const context: KernelContext = {
      tenantId: tenant.id,
      actorId: 'scheduler',
      environmentId: envId,
      surface: 'scheduler',
    };
    for (const spec of scheduledSpecs) {
      out.push({ spec, context });
    }
  }
  return out;
}
