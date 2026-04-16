/**
 * Lemon Squeezy read client. Uses the v1 JSON:API with Bearer auth.
 * Products, orders, and subscriptions for SaaS revenue visibility.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type LemonSqueezyCreds = { accessToken: string };
const API_BASE = 'https://api.lemonsqueezy.com/v1';

export async function getLemonSqueezyClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'lemon_squeezy', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Lemon Squeezy integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as LemonSqueezyCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/vnd.api+json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Lemon Squeezy ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  type JsonApiItem<T> = { id: string; attributes: T };

  return {
    integration,

    /** All products. */
    async listProducts() {
      const data = await get<{
        data: JsonApiItem<{ name: string; status: string; price: number; price_formatted: string; created_at: string }>[];
      }>('/products');
      return data.data.map(p => ({
        id: p.id,
        name: p.attributes.name,
        status: p.attributes.status,
        price: p.attributes.price / 100,
        priceFormatted: p.attributes.price_formatted,
        createdAt: p.attributes.created_at,
      }));
    },

    /** Recent orders. */
    async listOrders(limit = 25) {
      const data = await get<{
        data: JsonApiItem<{
          status: string;
          total: number;
          total_formatted: string;
          currency: string;
          user_email: string;
          created_at: string;
        }>[];
      }>('/orders', { 'page[size]': String(limit), sort: '-created_at' });
      return data.data.map(o => ({
        id: o.id,
        status: o.attributes.status,
        total: o.attributes.total / 100,
        totalFormatted: o.attributes.total_formatted,
        currency: o.attributes.currency,
        email: o.attributes.user_email,
        createdAt: o.attributes.created_at,
      }));
    },

    /** Active subscriptions. */
    async getSubscriptions() {
      const data = await get<{
        data: JsonApiItem<{
          status: string;
          product_name: string;
          user_email: string;
          renews_at: string;
          created_at: string;
        }>[];
      }>('/subscriptions', { 'filter[status]': 'active' });
      return data.data.map(s => ({
        id: s.id,
        status: s.attributes.status,
        productName: s.attributes.product_name,
        email: s.attributes.user_email,
        renewsAt: s.attributes.renews_at,
        createdAt: s.attributes.created_at,
      }));
    },
  };
}
