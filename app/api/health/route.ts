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
    checks.database = { status: 'error', message: err instanceof Error ? err.message : 'Unknown', ms: Date.now() - dbStart };
  }

  // 2. Required env vars
  const requiredEnvs = ['DATABASE_URL', 'GRID_ENCRYPTION_KEY'];
  const missingEnvs = requiredEnvs.filter(k => !process.env[k]);
  checks.env = missingEnvs.length === 0
    ? { status: 'ok' }
    : { status: 'error', message: `Missing: ${missingEnvs.join(', ')}` };

  // 3. Optional services
  const optionalServices: Record<string, string> = {
    ai: 'ANTHROPIC_API_KEY',
    email: 'RESEND_API_KEY',
    billing: 'STRIPE_SECRET_KEY',
    monitoring: 'SENTRY_DSN',
    redis: 'UPSTASH_REDIS_REST_URL',
    storage: 'S3_BUCKET',
  };

  for (const [name, envVar] of Object.entries(optionalServices)) {
    checks[name] = process.env[envVar]
      ? { status: 'ok' }
      : { status: 'warn', message: 'Not configured' };
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
