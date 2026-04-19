import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { getUsage } from '@/lib/billing/usage';
import { getPlanLimits, PLANS, type PlanType } from '@/lib/billing/plans';
import { getBetaTier } from '@/lib/config';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  // Beta mode is the safe default: paid plans are only live when the
  // tier is explicitly 'live' AND the full env is configured. Anything
  // less and we render the "Free during beta" screen — no broken
  // Upgrade buttons, no half-working Stripe flow.
  const tier = getBetaTier();
  const fullyConfigured =
    tier === 'live' &&
    !!process.env.STRIPE_SECRET_KEY &&
    !!process.env.STRIPE_PRO_PRICE_ID &&
    !!process.env.STRIPE_TEAM_PRICE_ID;

  if (!fullyConfigured) {
    return Response.json({
      plan: 'BETA',
      status: 'active',
      beta: true,
      message: 'All features available during beta',
    });
  }

  const sub = await prisma.subscription.findUnique({
    where: { identityId: identity.id },
  });

  const plan: PlanType = (sub?.plan as PlanType) ?? 'FREE';
  const limits = getPlanLimits(plan);
  const usage = await getUsage(identity.id);

  return Response.json({
    subscription: {
      plan,
      status: sub?.status ?? 'ACTIVE',
      currentPeriodStart: sub?.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      stripeCustomerId: sub?.stripeCustomerId ?? null,
    },
    planDetails: PLANS[plan],
    usage,
    limits,
  });
}
