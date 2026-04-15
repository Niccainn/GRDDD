import { prisma } from '@/lib/db';
import Stripe from 'stripe';

/** Extract period dates from first subscription item */
function getItemPeriod(sub: Stripe.Subscription): { start: Date; end: Date } | null {
  const item = sub.items?.data?.[0];
  if (!item) return null;
  return {
    start: new Date(item.current_period_start * 1000),
    end: new Date(item.current_period_end * 1000),
  };
}

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return new Response('Stripe not configured', { status: 500 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2026-03-25.dahlia' });
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const identityId = session.metadata?.identityId;
      const plan = session.metadata?.plan ?? 'PRO';

      if (!identityId) break;

      const stripeSubscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : null;

      // Fetch subscription details for period dates
      let periodStart: Date | null = null;
      let periodEnd: Date | null = null;
      if (stripeSubscriptionId) {
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const period = getItemPeriod(stripeSub as unknown as Stripe.Subscription);
        if (period) {
          periodStart = period.start;
          periodEnd = period.end;
        }
      }

      await prisma.subscription.upsert({
        where: { identityId },
        update: {
          plan,
          status: 'ACTIVE',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        create: {
          identityId,
          plan,
          status: 'ACTIVE',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const existing = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (!existing) break;

      const statusMap: Record<string, string> = {
        active: 'ACTIVE',
        canceled: 'CANCELED',
        past_due: 'PAST_DUE',
        trialing: 'TRIALING',
        unpaid: 'PAST_DUE',
      };

      const period = getItemPeriod(subscription);

      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: statusMap[subscription.status] ?? 'ACTIVE',
          ...(period
            ? {
                currentPeriodStart: period.start,
                currentPeriodEnd: period.end,
              }
            : {}),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const existing = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (!existing) break;

      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: 'CANCELED',
          cancelAtPeriodEnd: false,
        },
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subDetails = invoice.parent?.subscription_details;
      const stripeSubscriptionId =
        typeof subDetails?.subscription === 'string'
          ? subDetails.subscription
          : (subDetails?.subscription as Stripe.Subscription | null)?.id ?? null;

      if (!stripeSubscriptionId) break;

      const existing = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId },
      });

      if (!existing) break;

      await prisma.subscription.update({
        where: { stripeSubscriptionId },
        data: { status: 'PAST_DUE' },
      });
      break;
    }
  }

  return new Response('ok', { status: 200 });
}
