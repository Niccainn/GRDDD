import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { getUsage } from '@/lib/billing/usage';
import { getPlanLimits, PLANS, type PlanType } from '@/lib/billing/plans';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  if (!process.env.STRIPE_SECRET_KEY) {
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
