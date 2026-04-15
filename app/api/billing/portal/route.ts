import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';

export async function POST() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return Response.json({ error: 'Billing not configured. All features are free during beta.' }, { status: 503 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { identityId: identity.id },
  });

  if (!sub?.stripeCustomerId) {
    return Response.json({ error: 'No billing account found' }, { status: 404 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2026-03-25.dahlia' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${appUrl}/settings/billing`,
  });

  return Response.json({ url: session.url });
}
