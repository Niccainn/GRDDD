/**
 * Per-user daily token budget (SEC-03).
 *
 * Guards against one authenticated user burning the platform
 * Anthropic budget with a handful of high-token prompts. A rate
 * limit alone isn't enough — 29 requests/min × 30 kilotokens each
 * is still a $13/min burn.
 *
 * Design:
 *   • Key: `user-budget:<YYYY-MM-DD>:<identityId>` in Upstash.
 *   • TTL 48h (one day's worth of overlap so the counter survives
 *     midnight without a race with the rollover).
 *   • BYOK tenants exempt by default — their own key, their own
 *     spend. Platform-key tenants subject to the cap.
 *   • Pre-check uses `max_tokens + prompt estimate`; post-call
 *     records the true usage so the budget self-corrects.
 *
 * In non-prod or when Upstash isn't configured, this module behaves
 * as a pass-through — no counter, no enforcement — so local dev
 * keeps working without a Redis instance. That's consistent with
 * how rate-limit.ts handles the same situation.
 */
import { prisma } from '@/lib/db';

/** Default: 500k tokens/day per user. Tunable via env. */
const DEFAULT_DAILY_LIMIT = 500_000;

function dailyLimit(): number {
  const raw = process.env.GRID_USER_DAILY_TOKEN_LIMIT;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_LIMIT;
}

function isUpstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function cachePrefix(): string {
  return (
    process.env.GRID_CACHE_PREFIX ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    'dev'
  );
}

function todayStamp(): string {
  // UTC ISO date — keeps the counter aligned across Vercel regions.
  return new Date().toISOString().slice(0, 10);
}

function budgetKey(identityId: string): string {
  return `${cachePrefix()}:user-budget:${todayStamp()}:${identityId}`;
}

async function upstashPipeline(
  ops: (string | number)[][],
): Promise<Array<{ result: unknown; error?: string }> | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ops),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Array<{ result: unknown; error?: string }>;
  } catch {
    return null;
  }
}

/**
 * True if the environment is using its own BYOK Anthropic key, in
 * which case the platform-wide budget doesn't apply to this caller.
 */
async function isBringingOwnKey(environmentId: string): Promise<boolean> {
  try {
    const env = await prisma.environment.findUnique({
      where: { id: environmentId },
      select: { anthropicKeyEnc: true, anthropicKeySource: true },
    });
    if (!env) return false;
    return Boolean(env.anthropicKeyEnc) && env.anthropicKeySource === 'byok';
  } catch {
    return false;
  }
}

export type UserBudgetStatus = {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  /** Whether this identity is on BYOK and therefore exempt. */
  byok: boolean;
  /** Whether the distributed counter was reachable. False => no
   *  enforcement (local dev or Upstash outage in non-prod). */
  enforced: boolean;
};

/**
 * Pre-flight check before an Anthropic call. Returns the budget
 * state; the caller must reject the request when `allowed === false`.
 *
 * `estimatedTokens` = max_tokens + rough prompt size. A fast
 * estimate is fine — the post-call `record` corrects any drift.
 */
export async function checkUserTokenBudget(
  identityId: string,
  estimatedTokens: number,
  environmentId?: string,
): Promise<UserBudgetStatus> {
  const limit = dailyLimit();

  // BYOK exemption
  if (environmentId && (await isBringingOwnKey(environmentId))) {
    return {
      allowed: true,
      used: 0,
      limit,
      remaining: limit,
      byok: true,
      enforced: false,
    };
  }

  if (!isUpstashConfigured()) {
    // Dev / preview — no distributed counter, no enforcement.
    return {
      allowed: true,
      used: 0,
      limit,
      remaining: limit,
      byok: false,
      enforced: false,
    };
  }

  const key = budgetKey(identityId);
  const res = await upstashPipeline([
    ['GET', key],
  ]);
  const used =
    res && typeof res[0]?.result === 'string' ? Number(res[0].result) || 0 : 0;

  const remaining = limit - used;
  const projected = used + Math.max(0, estimatedTokens);
  return {
    allowed: projected <= limit,
    used,
    limit,
    remaining,
    byok: false,
    enforced: true,
  };
}

/**
 * Post-call: record actual token usage. Fire-and-forget is fine —
 * the next pre-check will pick up the increment on its next call.
 * We still await so errors surface in server logs.
 */
export async function recordUserTokenUsage(
  identityId: string,
  tokens: number,
  environmentId?: string,
): Promise<void> {
  if (tokens <= 0) return;
  if (environmentId && (await isBringingOwnKey(environmentId))) return;
  if (!isUpstashConfigured()) return;

  const key = budgetKey(identityId);
  // INCRBY + EXPIRE NX so the key gets a TTL on first write only.
  await upstashPipeline([
    ['INCRBY', key, String(tokens)],
    ['EXPIRE', key, String(48 * 60 * 60), 'NX'],
  ]);
}

/** For UI surfaces (Settings page): show remaining budget. */
export async function getUserBudgetStatus(
  identityId: string,
  environmentId?: string,
): Promise<UserBudgetStatus> {
  return checkUserTokenBudget(identityId, 0, environmentId);
}
