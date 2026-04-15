/**
 * Kernel budget — per-tenant daily spend cap.
 *
 * The circuit breaker that keeps an abusive tenant (or a runaway
 * agentic loop) from producing a $5k Anthropic invoice overnight.
 *
 * Enforcement points:
 *   - PRE: runtime.stream() calls checkBudget() before every Anthropic
 *     request. If the tenant is over cap the trace fails with a clear
 *     BudgetError and no model call happens.
 *   - POST: after computeCostUsd() the runtime calls recordSpend() so
 *     subsequent calls in the same UTC day see the accumulated total.
 *
 * Storage: in-memory Map keyed by tenantId. This is fine for a single
 * Node process. On Vercel / multi-instance this needs to move to Redis
 * (Upstash) — the interface is deliberately tiny so that swap is a
 * one-file change. Until then a tenant could theoretically get N×cap
 * by hammering N cold instances; acceptable risk for launch.
 *
 * Reset: lazily, on first read each UTC day. No background timer.
 */

const DEFAULT_DAILY_BUDGET_USD = 10;

function dailyCapUsd(): number {
  const env = process.env.GRID_DAILY_BUDGET_USD;
  if (!env) return DEFAULT_DAILY_BUDGET_USD;
  const parsed = Number(env);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_BUDGET_USD;
}

interface Bucket {
  dayKey: string; // YYYY-MM-DD in UTC
  spentUsd: number;
}

const buckets = new Map<string, Bucket>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getBucket(tenantId: string): Bucket {
  const today = todayKey();
  const existing = buckets.get(tenantId);
  if (existing && existing.dayKey === today) return existing;
  const fresh: Bucket = { dayKey: today, spentUsd: 0 };
  buckets.set(tenantId, fresh);
  return fresh;
}

export interface BudgetStatus {
  allowed: boolean;
  spentUsd: number;
  capUsd: number;
  dayKey: string;
}

/**
 * Check whether the tenant is still under their daily cap. Cheap —
 * called before every Anthropic request.
 */
export function checkBudget(tenantId: string): BudgetStatus {
  const bucket = getBucket(tenantId);
  const capUsd = dailyCapUsd();
  return {
    allowed: bucket.spentUsd < capUsd,
    spentUsd: bucket.spentUsd,
    capUsd,
    dayKey: bucket.dayKey,
  };
}

/**
 * Add an observed cost to the tenant's running total for today.
 */
export function recordSpend(tenantId: string, usd: number): void {
  if (!Number.isFinite(usd) || usd <= 0) return;
  const bucket = getBucket(tenantId);
  bucket.spentUsd += usd;
}

/**
 * Read-only snapshot for admin / debug surfaces.
 */
export function dailySpendUsd(tenantId: string): number {
  return getBucket(tenantId).spentUsd;
}

/**
 * Thrown by the runtime when a tenant has hit their daily cap. Callers
 * can distinguish this from generic errors to render a friendly
 * "daily budget exceeded" surface rather than a stack trace.
 */
export class BudgetError extends Error {
  readonly code = 'BUDGET_EXCEEDED' as const;
  readonly spentUsd: number;
  readonly capUsd: number;

  constructor(status: BudgetStatus) {
    super(
      `Daily budget exceeded: $${status.spentUsd.toFixed(4)} of $${status.capUsd.toFixed(2)} used. Resets at UTC midnight.`
    );
    this.name = 'BudgetError';
    this.spentUsd = status.spentUsd;
    this.capUsd = status.capUsd;
  }
}
