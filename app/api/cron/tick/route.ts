/**
 * POST /api/cron/tick
 *
 * The single entry point every external scheduler calls into at
 * 1-minute resolution. Vercel Cron, GitHub Actions, a systemd timer,
 * a Cloudflare cron trigger — any of them work.
 *
 * Auth: shared-secret header `x-grid-cron-token` matched against
 * `process.env.GRID_CRON_TOKEN`. A missing env var disables the
 * endpoint entirely (fail-closed) so cron can never run unattended
 * in an unconfigured environment.
 *
 * Behavior:
 *   1. Resolve every (spec, tenant context) pair that is currently
 *      armed for schedule-based triggers (cron-resolver.ts)
 *   2. Call tick() which filters by cronMatches(now) and dispatches
 *      the matching runs in parallel via the scheduler
 *   3. Return a compact summary — fired count, skipped count, totals
 *
 * Idempotency: this endpoint is NOT idempotent. Callers must respect
 * the 1-minute resolution — double-calling within the same minute
 * double-fires matching schedules. Vercel Cron and GitHub scheduled
 * actions respect this natively.
 */
import { NextRequest } from 'next/server';
import { tick } from '@/lib/workflows';
import { resolveActiveSchedules } from '@/lib/workflows/cron-resolver';
import { sweepExpiredTraces } from '@/lib/kernel/retention';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = process.env.GRID_CRON_TOKEN;
  if (!secret) {
    return Response.json(
      { error: 'Cron disabled (GRID_CRON_TOKEN unset)' },
      { status: 503 }
    );
  }

  const token = req.headers.get('x-grid-cron-token');
  if (token !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const schedules = await resolveActiveSchedules();
  const now = new Date();

  const result = await tick({ schedules, now });

  // Housekeeping: enforce trace retention on every tick. Failure here
  // must not block cron execution — we catch and report separately.
  let retention: Awaited<ReturnType<typeof sweepExpiredTraces>> | { error: string };
  try {
    retention = await sweepExpiredTraces();
  } catch (err) {
    retention = { error: err instanceof Error ? err.message : String(err) };
  }

  return Response.json({
    now: now.toISOString(),
    armed: schedules.length,
    fired: result.fired.length,
    skipped: result.skipped,
    retention,
    runs: result.fired.map((f) => ({
      slug: f.spec.slug,
      status: f.result.status,
      stages: f.result.stages.length,
      tokens: f.result.totalTokens,
      costUsd: f.result.totalCostUsd,
      durationMs: f.result.totalDurationMs,
    })),
  });
}

// Accept GET for platforms that only issue GET cron pings (Vercel Cron
// uses GET). Logic is identical.
export async function GET(req: NextRequest) {
  return POST(req);
}
