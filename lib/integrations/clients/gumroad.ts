/**
 * Gumroad read client. Uses the v2 API with Bearer auth.
 * Products and sales for creator revenue dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type GumroadCreds = { accessToken: string };
const API_BASE = 'https://api.gumroad.com/v2';

export async function getGumroadClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'gumroad', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Gumroad integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as GumroadCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gumroad ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** All products for the authenticated user. */
    async listProducts() {
      const data = await get<{
        success: boolean;
        products: {
          id: string;
          name: string;
          price: number;
          currency: string;
          sales_count: number;
          sales_usd_cents: number;
          published: boolean;
        }[];
      }>('/products');
      return data.products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price / 100,
        currency: p.currency,
        salesCount: p.sales_count,
        salesUsd: p.sales_usd_cents / 100,
        published: p.published,
      }));
    },

    /** Recent sales across all products. */
    async getSales(limit = 25) {
      const data = await get<{
        success: boolean;
        sales: {
          id: string;
          product_id: string;
          product_name: string;
          email: string;
          price: number;
          currency: string;
          created_at: string;
        }[];
      }>('/sales', { page: '1' });
      return data.sales.slice(0, limit).map(s => ({
        id: s.id,
        productId: s.product_id,
        productName: s.product_name,
        email: s.email,
        price: s.price / 100,
        currency: s.currency,
        createdAt: s.created_at,
      }));
    },
  };
}
