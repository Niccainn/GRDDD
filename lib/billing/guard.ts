import { prisma } from '@/lib/db';
import { PLAN_ORDER, type PlanType } from './plans';
import { checkLimit } from './usage';

/** Beta mode — all features unlocked when Stripe is not configured. */
function isBetaMode(): boolean {
  return !process.env.STRIPE_SECRET_KEY;
}

/**
 * Throw a 403 Response if the user's plan is below the required minimum.
 * In beta mode (no STRIPE_SECRET_KEY), all plans are unlocked.
 */
export async function requirePlan(
  identityId: string,
  minimumPlan: PlanType,
): Promise<void> {
  if (isBetaMode()) return;

  const sub = await prisma.subscription.findUnique({
    where: { identityId },
  });

  const currentPlan: PlanType = (sub?.plan as PlanType) ?? 'FREE';
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);
  const requiredIdx = PLAN_ORDER.indexOf(minimumPlan);

  if (currentIdx < requiredIdx) {
    throw new Response(
      JSON.stringify({
        error: 'Plan upgrade required',
        currentPlan,
        requiredPlan: minimumPlan,
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

/**
 * Throw a 429 Response if the user has exceeded their plan limit for a metric.
 * In beta mode (no STRIPE_SECRET_KEY), all limits are bypassed.
 *
 * Throws-on-block — for callers that bubble Responses up via a wrapper.
 * For Next.js route handlers, prefer `enforceLimitOrResponse` below
 * which returns a Response instead, since route handlers must return.
 */
export async function enforceLimit(
  identityId: string,
  metric: string,
): Promise<void> {
  if (isBetaMode()) return;

  const result = await checkLimit(identityId, metric);

  if (!result.allowed) {
    throw new Response(
      JSON.stringify({
        error: 'Usage limit exceeded',
        metric,
        current: result.current,
        limit: result.limit,
        plan: result.plan,
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

/**
 * Return-style version for Next.js route handlers. Returns the 429
 * Response if the limit is exceeded, or null if the call may proceed.
 *
 *   const blocked = await enforceLimitOrResponse(identity.id, 'executions');
 *   if (blocked) return blocked;
 *
 * Beta mode (no STRIPE_SECRET_KEY) always returns null — caps are
 * advisory until billing is wired in production.
 */
export async function enforceLimitOrResponse(
  identityId: string,
  metric: string,
): Promise<Response | null> {
  if (isBetaMode()) return null;

  const result = await checkLimit(identityId, metric);
  if (result.allowed) return null;

  return Response.json(
    {
      error: 'Usage limit exceeded',
      metric,
      current: result.current,
      limit: result.limit,
      plan: result.plan,
      // The marketing page advertises tier upgrades as the path forward;
      // the UI surfaces this hint as an upgrade CTA.
      upgrade: result.plan === 'FREE' ? 'PRO' : result.plan === 'PRO' ? 'TEAM' : null,
    },
    { status: 429 },
  );
}
