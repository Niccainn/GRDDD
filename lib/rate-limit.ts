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
