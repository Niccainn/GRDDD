import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { plan } = await req.json();

  if (!plan || !['PRO', 'TEAM'].includes(plan)) {
    return Response.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return Response.json({ error: 'Billing not configured. All features are free during beta.' }, { status: 503 });
  }

  const priceId =
    plan === 'PRO'
      ? process.env.STRIPE_PRO_PRICE_ID
      : process.env.STRIPE_TEAM_PRICE_ID;

  if (!priceId) {
    return Response.json({ error: 'Price not configured' }, { status: 500 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2026-03-25.dahlia' });
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

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings/billing?success=1`,
    cancel_url: `${appUrl}/settings/billing?canceled=1`,
    metadata: { identityId: identity.id, plan },
  });

  return Response.json({ url: session.url });
}
