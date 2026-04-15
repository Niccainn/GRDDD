import { prisma } from '@/lib/db';
import { getPlanLimits, type PlanType } from './plans';

/** First day of the current month (UTC) */
function currentPeriod(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Increment a usage metric for the current billing period.
 * Uses upsert so the first call in a period creates the row.
 */
export async function trackUsage(
  identityId: string,
  metric: string,
  count: number = 1,
) {
  const period = currentPeriod();

  await prisma.usageRecord.upsert({
    where: {
      identityId_metric_period: { identityId, metric, period },
    },
    update: { count: { increment: count } },
    create: { identityId, metric, count, period },
  });
}

/**
 * Return current-month usage for all tracked metrics.
 */
export async function getUsage(
  identityId: string,
): Promise<Record<string, number>> {
  const period = currentPeriod();

  const records = await prisma.usageRecord.findMany({
    where: { identityId, period },
  });

  const usage: Record<string, number> = {
    executions: 0,
    nova_queries: 0,
    api_calls: 0,
    storage_mb: 0,
  };

  for (const r of records) {
    usage[r.metric] = r.count;
  }

  return usage;
}

/**
 * Check whether the identity can perform one more unit of the given metric.
 */
export async function checkLimit(
  identityId: string,
  metric: string,
): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  plan: PlanType;
}> {
  const sub = await prisma.subscription.findUnique({
    where: { identityId },
  });

  const plan: PlanType = (sub?.plan as PlanType) ?? 'FREE';
  const limits = getPlanLimits(plan);
  const limitValue = (limits as Record<string, number>)[metric] ?? 0;

  const usage = await getUsage(identityId);
  const current = usage[metric] ?? 0;

  return {
    allowed: limitValue === Infinity || current < limitValue,
    current,
    limit: limitValue,
    plan,
  };
}
