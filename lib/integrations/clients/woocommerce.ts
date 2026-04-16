/**
 * WooCommerce read client. Uses the WC REST API v3 with
 * Basic auth (consumer_key:consumer_secret). Orders, products,
 * and order totals for revenue dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type WooCommerceCreds = { siteUrl: string; consumerKey: string; consumerSecret: string };

export async function getWooCommerceClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'woocommerce', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('WooCommerce integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as WooCommerceCreds;
  const site = creds.siteUrl.replace(/\/+$/, '');
  const base = `${site}/wp-json/wc/v3`;
  const authHeader = `Basic ${btoa(`${creds.consumerKey}:${creds.consumerSecret}`)}`;
  const headers = { Authorization: authHeader, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WooCommerce ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Recent orders sorted by date descending. */
    async getRecentOrders(limit = 25) {
      return get<{
        id: number;
        status: string;
        total: string;
        currency: string;
        date_created: string;
        billing: { first_name: string; last_name: string; email: string };
      }[]>('/orders', { per_page: String(limit), orderby: 'date', order: 'desc' });
    },

    /** Products list. */
    async getProducts(limit = 25) {
      return get<{
        id: number;
        name: string;
        status: string;
        price: string;
        total_sales: number;
        stock_status: string;
      }[]>('/products', { per_page: String(limit) });
    },

    /** Order totals by status (processing, completed, etc.). */
    async getOrderTotals() {
      return get<{ slug: string; name: string; total: number }[]>('/reports/orders/totals');
    },
  };
}
