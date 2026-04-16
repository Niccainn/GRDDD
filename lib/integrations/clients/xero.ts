/**
 * Xero read client. Uses the Accounting API v2.0 with Bearer auth
 * and Xero-Tenant-Id header. Invoices, P&L, and bank accounts
 * for finance dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type XeroCreds = { accessToken: string; tenantId: string };
const API_BASE = 'https://api.xero.com/api.xro/2.0';

export async function getXeroClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'xero', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Xero integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as XeroCreds;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${creds.accessToken}`,
    'Xero-Tenant-Id': creds.tenantId,
    Accept: 'application/json',
  };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Xero ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Recent invoices. */
    async getInvoices(limit = 25) {
      const data = await get<{
        Invoices: {
          InvoiceID: string;
          InvoiceNumber: string;
          Type: string;
          Status: string;
          Total: number;
          AmountDue: number;
          CurrencyCode: string;
          Contact: { Name: string };
          DateString: string;
          DueDateString: string;
        }[];
      }>('/Invoices', { page: '1', order: 'DateString DESC' });
      return data.Invoices.slice(0, limit).map(inv => ({
        id: inv.InvoiceID,
        number: inv.InvoiceNumber,
        type: inv.Type,
        status: inv.Status,
        total: inv.Total,
        amountDue: inv.AmountDue,
        currency: inv.CurrencyCode,
        contact: inv.Contact.Name,
        date: inv.DateString,
        dueDate: inv.DueDateString,
      }));
    },

    /** Profit and Loss report for the current month. */
    async getProfitAndLoss() {
      const now = new Date();
      const fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const toDate = now.toISOString().split('T')[0];
      const data = await get<{
        Reports: {
          ReportName: string;
          Rows: { RowType: string; Title?: string; Cells?: { Value: string }[]; Rows?: { Cells: { Value: string }[] }[] }[];
        }[];
      }>('/Reports/ProfitAndLoss', { fromDate, toDate });
      return data.Reports[0] ?? null;
    },

    /** All bank accounts linked in Xero. */
    async getBankAccounts() {
      const data = await get<{
        Accounts: {
          AccountID: string;
          Name: string;
          Type: string;
          BankAccountNumber: string;
          CurrencyCode: string;
          Status: string;
        }[];
      }>('/Accounts', { where: 'Type=="BANK"' });
      return data.Accounts.map(a => ({
        id: a.AccountID,
        name: a.Name,
        type: a.Type,
        accountNumber: a.BankAccountNumber,
        currency: a.CurrencyCode,
        status: a.Status,
      }));
    },
  };
}
