/**
 * PayPal read client. Uses the v1/v2 REST API with Bearer auth.
 * Transaction history and balance for revenue dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type PayPalCreds = { accessToken: string };
const API_BASE = 'https://api-m.paypal.com';

export async function getPayPalClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'paypal', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('PayPal integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as PayPalCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PayPal ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Transaction history for a date range (ISO strings). */
    async listTransactions(startDate: string, endDate: string) {
      const data = await get<{
        transaction_details: {
          transaction_info: {
            transaction_id: string;
            transaction_amount: { value: string; currency_code: string };
            transaction_status: string;
            transaction_updated_date: string;
          };
          payer_info?: { email_address: string };
        }[];
      }>('/v1/reporting/transactions', {
        start_date: startDate,
        end_date: endDate,
        fields: 'transaction_info,payer_info',
      });
      return data.transaction_details.map(t => ({
        id: t.transaction_info.transaction_id,
        amount: Number(t.transaction_info.transaction_amount.value),
        currency: t.transaction_info.transaction_amount.currency_code,
        status: t.transaction_info.transaction_status,
        updatedAt: t.transaction_info.transaction_updated_date,
        payerEmail: t.payer_info?.email_address ?? null,
      }));
    },

    /** Account balance across all currencies. */
    async getBalance() {
      const data = await get<{
        balances: { currency_code: string; total_balance: { value: string }; available_balance: { value: string } }[];
      }>('/v1/reporting/balances');
      return data.balances.map(b => ({
        currency: b.currency_code,
        total: Number(b.total_balance.value),
        available: Number(b.available_balance.value),
      }));
    },
  };
}
