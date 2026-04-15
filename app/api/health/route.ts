/**
 * GET /api/health
 *
 * Production health check that verifies critical dependencies.
 *
 * Returns 200 when healthy, 503 when any critical check fails.
 * Uptime monitors (Better Stack, UptimeRobot, Pingdom, Vercel)
 * see the failure as a real outage rather than a noisy success.
 *
 * Probed dependencies:
 *   - Database connectivity (SELECT 1)
 *   - Required env vars (DATABASE_URL, GRID_ENCRYPTION_KEY)
 *   - Optional services (AI, email, billing, monitoring, redis, storage)
 */
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error' | 'warn'; message?: string; ms?: number }> = {};

  // 1. Database connectivity
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', ms: Date.now() - dbStart };
  } catch (err) {
    // Never leak DB error details (may contain connection strings or
    // internal topology). Log server-side, return opaque error to caller.
    // eslint-disable-next-line no-console
    console.error('[health] database check failed:', err);
    checks.database = { status: 'error', message: 'Connection failed', ms: Date.now() - dbStart };
  }

  // 2. Required env vars — only report count, never names
  const requiredEnvs = ['DATABASE_URL', 'GRID_ENCRYPTION_KEY'];
  const missingCount = requiredEnvs.filter(k => !process.env[k]).length;
  checks.env = missingCount === 0
    ? { status: 'ok' }
    : { status: 'error', message: `${missingCount} required variable(s) missing` };

  // 3. Optional services — report status only, never env var names
  const optionalServices: [string, string][] = [
    ['ai', 'ANTHROPIC_API_KEY'],
    ['email', 'RESEND_API_KEY'],
    ['billing', 'STRIPE_SECRET_KEY'],
    ['monitoring', 'SENTRY_DSN'],
    ['redis', 'UPSTASH_REDIS_REST_URL'],
    ['storage', 'S3_BUCKET'],
  ];

  for (const [name, envVar] of optionalServices) {
    checks[name] = process.env[envVar]
      ? { status: 'ok' }
      : { status: 'warn' };
  }

  // Overall status
  const hasError = Object.values(checks).some(c => c.status === 'error');
  const hasWarn = Object.values(checks).some(c => c.status === 'warn');
  const overall = hasError ? 'unhealthy' : hasWarn ? 'degraded' : 'healthy';

  return Response.json(
    { status: overall, checks, timestamp: new Date().toISOString(), version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev' },
    { status: hasError ? 503 : 200 }
  );
}
