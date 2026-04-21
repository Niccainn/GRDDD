/**
 * Rate limiting — three-tier.
 *
 *   1. Sync in-memory limiter (rateLimit, rateLimitApi).
 *      Per-instance, fast, no network. Used by ~40 internal API routes
 *      that already require an authenticated session and don't burn
 *      external budget. Per-instance bypass is acceptable for listings
 *      and reads.
 *
 *   2. Async distributed limiter (rateLimitDistributed / *Strict).
 *      Upstash-backed sliding window. Mandatory for any endpoint that
 *      spends money downstream (Anthropic tokens, Stripe fees, email
 *      sends) — a cold-start bypass on these paths is a cost-DoS
 *      vector. In production the Strict variants fail-closed when
 *      Upstash is unreachable rather than silently falling back.
 *
 *   3. Auth-perimeter limiter (rateLimitSignIn*Distributed, etc.)
 *      Also distributed, also mandatory in prod, because multi-instance
 *      bypass on sign-in enables credential stuffing and account
 *      enumeration.
 *
 * Config:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *   GRID_CACHE_PREFIX       — optional per-deployment key namespace
 *                             (see SEC-11). Defaults to VERCEL_ENV.
 *
 * In production (NODE_ENV=production AND VERCEL_ENV=production), both
 * Upstash env vars MUST be set or assertRateLimitReady() throws on
 * first request. In non-prod, absent Upstash transparently falls back
 * to the in-memory limiter so developers don't need a Redis instance.
 */
const store = new Map<string, { count: number; resetAt: number }>();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Sliding window rate limiter.
 * @param key - unique identifier (userId, IP, etc.)
 * @param limit - max requests per window
 * @param windowMs - window duration in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/** Rate limit for general API routes: 120 req/min */
export function rateLimitApi(userId: string): RateLimitResult {
  return rateLimit(`api:${userId}`, 120, 60_000);
}

/** Rate limit for Nova AI routes: 30 req/min */
export function rateLimitNova(userId: string): RateLimitResult {
  return rateLimit(`nova:${userId}`, 30, 60_000);
}

/** Rate limit for agent runs: 20 runs/min per identity. Generous for
 *  rapid iteration, tight enough to prevent runaway scripts from
 *  burning through Anthropic budget. */
export function rateLimitAgentRun(userId: string): RateLimitResult {
  return rateLimit(`agent-run:${userId}`, 20, 60_000);
}

// ─── Distributed (Upstash) limiter ───────────────────────────────────────
//
// Uses the Upstash REST API directly so we don't need to install the
// `@upstash/redis` package as a hard dependency. The protocol is:
//
//   POST $UPSTASH_REDIS_REST_URL/pipeline
//   Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN
//   Body: [["INCR","key"], ["EXPIRE","key","60","NX"]]
//
// Returns: [{ "result": <count> }, { "result": 0|1 }]
//
// We INCR the counter and EXPIRE only if the key didn't exist (NX),
// giving us a fixed-window limiter with one round trip.

function isUpstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function isProductionDeployment(): boolean {
  // Vercel sets VERCEL_ENV=production for the prod deployment;
  // preview/development deployments get "preview" or "development".
  // Defensive: treat NODE_ENV=production as prod too for non-Vercel
  // self-hosts.
  return (
    process.env.VERCEL_ENV === 'production' ||
    (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV)
  );
}

/** Derive a per-deployment cache-key prefix so preview/staging/prod
 *  don't collide on a shared Upstash instance (SEC-11). */
function cachePrefix(): string {
  return (
    process.env.GRID_CACHE_PREFIX ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    'dev'
  );
}

/** Throws on first strict call in prod if Upstash is missing. Call
 *  sites that depend on distributed rate limiting for cost control
 *  (Nova, agent runs, email sends) should use this to fail loud. */
export function assertRateLimitReady(): void {
  if (isProductionDeployment() && !isUpstashConfigured()) {
    throw new Error(
      'Distributed rate limiting is required in production. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.',
    );
  }
}

interface UpstashPipelineResponse {
  result: unknown;
  error?: string;
}

async function upstashIncr(key: string, ttlSeconds: number): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(ttlSeconds), 'NX'],
      ]),
      // Upstash REST is fast — if it's slow we'd rather time out than
      // block sign-in for 10 seconds.
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as UpstashPipelineResponse[];
    const incrResult = data[0]?.result;
    return typeof incrResult === 'number' ? incrResult : null;
  } catch {
    return null;
  }
}

/**
 * Distributed rate limiter for high-stakes endpoints (auth perimeter).
 * Uses Upstash REST when configured, falls back to in-memory otherwise.
 *
 * @param key       unique identifier for the limited bucket
 * @param limit     max requests per window
 * @param windowMs  window duration in ms
 */
export async function rateLimitDistributed(
  key: string,
  limit: number,
  windowMs: number,
  opts: { strict?: boolean } = {},
): Promise<RateLimitResult> {
  // Strict mode (cost-gate endpoints): in prod, Upstash MUST be
  // configured. Fail closed if it's missing so ops notices.
  if (opts.strict && isProductionDeployment() && !isUpstashConfigured()) {
    return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs };
  }

  if (!isUpstashConfigured()) {
    // Dev / preview fallback — still rate-limited, just per-instance.
    return rateLimit(key, limit, windowMs);
  }

  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const namespacedKey = `${cachePrefix()}:rl:${key}`;
  const count = await upstashIncr(namespacedKey, ttlSeconds);

  if (count === null) {
    // Upstash unreachable. In strict mode (cost-gate) fail closed —
    // better to bounce one user than let an attacker burn the budget
    // during an outage. In non-strict mode degrade to in-memory so
    // reads keep working.
    if (opts.strict) {
      return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs };
    }
    return rateLimit(key, limit, windowMs);
  }

  const resetAt = Date.now() + windowMs;
  if (count > limit) {
    return { allowed: false, remaining: 0, resetAt };
  }
  return { allowed: true, remaining: limit - count, resetAt };
}

/** Strict, distributed Nova rate limiter. 30 req/min per user AND
 *  a shared 2k req/hr ceiling per user across all instances. Fails
 *  closed in prod if Upstash is misconfigured. */
export async function rateLimitNovaStrict(userId: string): Promise<RateLimitResult> {
  // Per-minute bucket (spike control)
  const perMin = await rateLimitDistributed(
    `nova:min:${userId}`,
    30,
    60_000,
    { strict: true },
  );
  if (!perMin.allowed) return perMin;
  // Per-hour bucket (cost ceiling — catches slow-drip attacks)
  return rateLimitDistributed(
    `nova:hr:${userId}`,
    500,
    60 * 60_000,
    { strict: true },
  );
}

/** Strict, distributed agent-run limiter. Runs spend tokens + sometimes
 *  Stripe fees, so treat like Nova. */
export async function rateLimitAgentRunStrict(userId: string): Promise<RateLimitResult> {
  const perMin = await rateLimitDistributed(
    `agent:min:${userId}`,
    20,
    60_000,
    { strict: true },
  );
  if (!perMin.allowed) return perMin;
  return rateLimitDistributed(
    `agent:hr:${userId}`,
    200,
    60 * 60_000,
    { strict: true },
  );
}

/** Distributed sign-in limiter: 10 attempts per IP per 15 min */
export function rateLimitSignInByIpDistributed(ip: string): Promise<RateLimitResult> {
  return rateLimitDistributed(`signin:ip:${ip}`, 10, 15 * 60_000);
}

/** Distributed sign-in limiter: 5 attempts per email per 15 min */
export function rateLimitSignInByEmailDistributed(email: string): Promise<RateLimitResult> {
  return rateLimitDistributed(`signin:email:${email.toLowerCase()}`, 5, 15 * 60_000);
}

/** Distributed sign-up limiter: 4 signups per IP per hour */
export function rateLimitSignUpByIpDistributed(ip: string): Promise<RateLimitResult> {
  return rateLimitDistributed(`signup:ip:${ip}`, 4, 60 * 60_000);
}

export function isDistributedRateLimitConfigured(): boolean {
  return isUpstashConfigured();
}
