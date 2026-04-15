/**
 * Stripe read client. Uses plain HTTP against the Stripe REST API —
 * no SDK — so the client stays zero-dep. Balance, revenue, and
 * subscription metrics are the three things agents care about.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type StripeCreds = { secretKey: string };
const API_BASE = 'https://api.stripe.com/v1';

export async function getStripeClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'stripe', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Stripe integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as StripeCreds;
  const headers = { Authorization: `Bearer ${creds.secretKey}` };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Stripe ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Current available + pending balance across all currencies. */
    async getBalance() {
      const data = await get<{
        available: { amount: number; currency: string }[];
        pending: { amount: number; currency: string }[];
      }>('/balance');
      return {
        available: data.available.map(b => ({ amount: b.amount / 100, currency: b.currency })),
        pending: data.pending.map(b => ({ amount: b.amount / 100, currency: b.currency })),
      };
    },

    /** Recent charges (succeeded) for revenue visibility. */
    async getRecentCharges(limit = 20) {
      const data = await get<{
        data: { id: string; amount: number; currency: string; status: string; created: number; description: string | null }[];
      }>('/charges', { limit: String(limit) });
      return data.data.map(c => ({
        id: c.id,
        amount: c.amount / 100,
        currency: c.currency,
        status: c.status,
        created: new Date(c.created * 1000).toISOString(),
        description: c.description,
      }));
    },

    /** Active subscription count + MRR approximation. */
    async getActiveSubscriptions(limit = 100) {
      const data = await get<{
        data: { id: string; status: string; items: { data: { price: { unit_amount: number; recurring: { interval: string } } }[] } }[];
      }>('/subscriptions', { status: 'active', limit: String(limit) });
      let mrrCents = 0;
      for (const sub of data.data) {
        for (const item of sub.items.data) {
          const amt = item.price.unit_amount ?? 0;
          const interval = item.price.recurring?.interval;
          if (interval === 'month') mrrCents += amt;
          else if (interval === 'year') mrrCents += Math.round(amt / 12);
          else if (interval === 'week') mrrCents += Math.round(amt * 4.33);
        }
      }
      return { count: data.data.length, mrr: mrrCents / 100 };
    },
  };
}
