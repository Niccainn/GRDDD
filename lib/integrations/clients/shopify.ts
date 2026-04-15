/**
 * Shopify read client. Uses the Admin REST API (2024-07). Orders,
 * products, and customers are the three read surfaces exposed to
 * agents; write operations (create discount, cancel order) live in
 * the Phase 5 mutating toolset.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type ShopifyCreds = { shopDomain: string; accessToken: string };

export async function getShopifyClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'shopify', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Shopify integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as ShopifyCreds;
  const domain = creds.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const base = `https://${domain}/admin/api/2024-07`;
  const headers = { 'X-Shopify-Access-Token': creds.accessToken, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Recent orders (any financial status). */
    async getRecentOrders(limit = 25) {
      const data = await get<{
        orders: {
          id: number;
          name: string;
          email: string | null;
          total_price: string;
          currency: string;
          financial_status: string;
          fulfillment_status: string | null;
          created_at: string;
        }[];
      }>('/orders.json', { limit: String(limit), status: 'any' });
      return data.orders.map(o => ({
        id: o.id,
        name: o.name,
        email: o.email,
        total: Number(o.total_price),
        currency: o.currency,
        financialStatus: o.financial_status,
        fulfillmentStatus: o.fulfillment_status,
        createdAt: o.created_at,
      }));
    },

    /** Store totals: order count + revenue over last 30 days. */
    async getOrderTotals30d() {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const data = await get<{
        orders: { total_price: string; currency: string; financial_status: string }[];
      }>('/orders.json', { status: 'any', created_at_min: since, limit: '250' });
      const paid = data.orders.filter(o => o.financial_status === 'paid');
      const revenue = paid.reduce((sum, o) => sum + Number(o.total_price), 0);
      const currency = paid[0]?.currency ?? data.orders[0]?.currency ?? 'USD';
      return { orders: data.orders.length, paidOrders: paid.length, revenue, currency };
    },
  };
}
