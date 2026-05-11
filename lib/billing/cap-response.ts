/**
 * Client helper for plan-cap 429 responses from enforceLimitOrResponse.
 *
 * The /api/workflows/[id]/run, /api/executions, and /api/nova/execute
 * routes all gate on plan caps and return:
 *
 *   429 {
 *     error: 'Usage limit exceeded',
 *     metric: 'executions' | 'nova_queries' | ...,
 *     current: number,
 *     limit: number,
 *     plan: 'FREE' | 'PRO' | 'TEAM',
 *     upgrade: 'PRO' | 'TEAM' | null
 *   }
 *
 * Callers handle the cap by:
 *
 *   const capped = await readCapResponse(res);
 *   if (capped) { toast(capped.message, 'error'); return; }
 *
 * Returning a structured object instead of throwing keeps the call
 * site explicit about the bail path. The `metric` and `upgrade` fields
 * are exposed so a richer UI (toast vs in-page banner with a /pricing
 * link) can branch on them without re-parsing the body.
 */

import { PLANS, type PlanType } from './plans';

export type CapResponse = {
  metric: string;
  current: number;
  limit: number;
  plan: PlanType;
  upgrade: PlanType | null;
  /** Pre-formatted single-line message, suitable for a toast.  The
   *  caller can override if it wants a richer surface. */
  message: string;
};

const METRIC_LABELS: Record<string, string> = {
  executions: 'executions',
  nova_queries: 'Atrium queries',
  api_calls: 'API calls',
};

/**
 * Inspect a fetch Response. Returns a CapResponse if the server
 * rejected the call with a plan-cap 429, otherwise null.  Consumes the
 * body — callers must not call `.json()` afterwards.
 */
export async function readCapResponse(res: Response): Promise<CapResponse | null> {
  if (res.status !== 429) return null;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }
  if (!body || typeof body !== 'object') return null;
  const b = body as {
    error?: string;
    metric?: string;
    current?: number;
    limit?: number;
    plan?: string;
    upgrade?: string | null;
  };
  if (b.error !== 'Usage limit exceeded') return null;
  if (typeof b.metric !== 'string' || typeof b.current !== 'number' || typeof b.limit !== 'number') {
    return null;
  }
  const plan = (b.plan ?? 'FREE') as PlanType;
  const upgrade = (b.upgrade ?? null) as PlanType | null;
  const metricLabel = METRIC_LABELS[b.metric] ?? b.metric;
  const planName = PLANS[plan]?.name ?? plan;
  const upgradeName = upgrade ? PLANS[upgrade]?.name : null;
  const message = upgradeName
    ? `${planName} cap reached (${b.current}/${b.limit} ${metricLabel}). Upgrade to ${upgradeName} in Settings → Billing.`
    : `${planName} cap reached (${b.current}/${b.limit} ${metricLabel}). Contact support to extend.`;
  return {
    metric: b.metric,
    current: b.current,
    limit: b.limit,
    plan,
    upgrade,
    message,
  };
}
