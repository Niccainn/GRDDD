/**
 * FreshBooks read client. Uses the Accounting API with Bearer auth.
 * Invoices and expenses for small business finance dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type FreshBooksCreds = { accessToken: string; accountId: string };

export async function getFreshBooksClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'freshbooks', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('FreshBooks integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as FreshBooksCreds;
  const base = `https://api.freshbooks.com/accounting/account/${creds.accountId}`;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`FreshBooks ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Recent invoices. */
    async listInvoices(limit = 25) {
      const data = await get<{
        response: {
          result: {
            invoices: {
              id: number;
              invoice_number: string;
              status: number;
              amount: { amount: string; code: string };
              outstanding: { amount: string; code: string };
              customerid: number;
              create_date: string;
              due_date: string;
            }[];
          };
        };
      }>('/invoices/invoices', { per_page: String(limit), sort: 'create_date_desc' });
      return data.response.result.invoices.map(inv => ({
        id: inv.id,
        number: inv.invoice_number,
        status: inv.status,
        amount: Number(inv.amount.amount),
        currency: inv.amount.code,
        outstanding: Number(inv.outstanding.amount),
        customerId: inv.customerid,
        createdAt: inv.create_date,
        dueDate: inv.due_date,
      }));
    },

    /** Recent expenses. */
    async listExpenses(limit = 25) {
      const data = await get<{
        response: {
          result: {
            expenses: {
              id: number;
              categoryid: number;
              amount: { amount: string; code: string };
              vendor: string | null;
              date: string;
              notes: string;
              status: number;
            }[];
          };
        };
      }>('/expenses/expenses', { per_page: String(limit), sort: 'date_desc' });
      return data.response.result.expenses.map(e => ({
        id: e.id,
        categoryId: e.categoryid,
        amount: Number(e.amount.amount),
        currency: e.amount.code,
        vendor: e.vendor,
        date: e.date,
        notes: e.notes,
        status: e.status,
      }));
    },
  };
}
