/**
 * Rate limiting — two-tier.
 *
 *   1. Sync in-memory limiter (rateLimit, rateLimitApi, rateLimitNova).
 *      Per-instance, fast, no network. Used by ~40 internal API routes
 *      that already require an authenticated session — at worst a
 *      noisy authed user can burn N×limit if Vercel cold-starts N
 *      instances. Acceptable risk because the blast radius is bounded
 *      by their daily Anthropic budget cap.
 *
 *   2. Async Upstash-backed limiter (rateLimitDistributed). Used ONLY
 *      by the auth endpoints (sign-in, sign-up, password reset, etc.)
 *      where multi-instance bypass would enable credential stuffing
 *      and account enumeration. This goes through a real network
 *      round-trip per check so it's strictly the high-stakes path.
 *
 * The split is deliberate: forcing every internal route to await a
 * Redis call would add ~20ms per request × 40 routes for negligible
 * security benefit. Keep the boundary at the auth perimeter where it
 * actually matters.
 *
 * To enable distributed rate limiting set both env vars:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 * When unset, rateLimitDistributed transparently falls back to the
 * in-memory limiter.
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
  windowMs: number
): Promise<RateLimitResult> {
  if (!isUpstashConfigured()) {
    return rateLimit(key, limit, windowMs);
  }

  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const namespacedKey = `grid:rl:${key}`;
  const count = await upstashIncr(namespacedKey, ttlSeconds);

  if (count === null) {
    // Upstash unreachable — degrade gracefully to in-memory rather
    // than fail-open. The local limiter still gives us per-instance
    // protection while ops investigates.
    return rateLimit(key, limit, windowMs);
  }

  const resetAt = Date.now() + windowMs;
  if (count > limit) {
    return { allowed: false, remaining: 0, resetAt };
  }
  return { allowed: true, remaining: limit - count, resetAt };
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
