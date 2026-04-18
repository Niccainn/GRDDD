import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';
import { getBetaTier } from '@/lib/config';
import { validateStripeKeyForTier, computeBetaTrialDays } from '@/lib/billing/guardrails';

/**
 * Checkout session creation.
 *
 * Safety invariants the tests lock in:
 *
 * 1. If STRIPE_SECRET_KEY is missing we return 503 with a clear "free
 *    during beta" message — we never silently 500.
 * 2. Outside the 'live' tier we REFUSE live Stripe keys (sk_live_*).
 *    This prevents a misconfigured preview deploy from creating real
 *    charges. Only sk_test_* is accepted in closed/byok tiers.
 * 3. During beta (any non-live tier) the checkout captures a payment
 *    method but does NOT charge — we inject a trial period via
 *    STRIPE_BETA_TRIAL_DAYS (default 30). This is the "up to capture"
 *    contract: card on file, zero actual money movement until GA.
 */
export async function POST(req: Request) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { plan } = await req.json();

  if (!plan || !['PRO', 'TEAM'].includes(plan)) {
    return Response.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const tier = getBetaTier();

  // Guardrails live in a pure helper so they're exercised by
  // __tests__/billing-guardrails.test.ts without booting Stripe/Prisma.
  const guard = validateStripeKeyForTier(secretKey, tier);
  if (!guard.ok) {
    const beta503 = guard.status === 503
      ? 'Billing not configured. All features are free during beta.'
      : guard.error;
    return Response.json({ error: beta503 }, { status: guard.status });
  }

  const priceId =
    plan === 'PRO'
      ? process.env.STRIPE_PRO_PRICE_ID
      : process.env.STRIPE_TEAM_PRICE_ID;

  if (!priceId) {
    return Response.json({ error: 'Price not configured' }, { status: 500 });
  }

  // secretKey is guaranteed defined here — guard.ok === true only when
  // it's set and tier-valid. Assertion satisfies TS's narrowing.
  const stripe = new Stripe(secretKey!, { apiVersion: '2026-03-25.dahlia' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Re-use existing Stripe customer if we have one
  const sub = await prisma.subscription.findUnique({
    where: { identityId: identity.id },
  });

  let customerId = sub?.stripeCustomerId ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: identity.email ?? undefined,
      name: identity.name,
      metadata: { identityId: identity.id },
    });
    customerId = customer.id;
  }

  // Trial: outside live tier we default to 30 days (configurable via
  // STRIPE_BETA_TRIAL_DAYS) so captured cards never become real charges.
  const trialDays = computeBetaTrialDays(tier, process.env.STRIPE_BETA_TRIAL_DAYS);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_collection: 'always',
    success_url: `${appUrl}/settings/billing?success=1`,
    cancel_url: `${appUrl}/settings/billing?canceled=1`,
    metadata: { identityId: identity.id, plan, betaTier: tier },
    ...(trialDays ? {
      subscription_data: {
        trial_period_days: trialDays,
        trial_settings: { end_behavior: { missing_payment_method: 'pause' } },
      },
    } : {}),
  });

  return Response.json({ url: session.url, trialDays: trialDays ?? null });
}
