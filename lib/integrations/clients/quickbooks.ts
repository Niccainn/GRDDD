/**
 * QuickBooks Online read client. Uses the Accounting API v3 for
 * company info, invoices, and profit-and-loss reports. OAuth2 bearer
 * token auth with lazy refresh (mirrors the google-shared.ts pattern).
 */

import { prisma } from '@/lib/db';
import { decryptString, encryptString } from '@/lib/crypto/key-encryption';

type QuickBooksCreds = { accessToken: string; realmId: string };

const REFRESH_SKEW_MS = 60 * 1000;
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

export async function getQuickBooksClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'quickbooks', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('QuickBooks integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as QuickBooksCreds;
  const apiBase = `https://quickbooks.api.intuit.com/v3/company/${creds.realmId}`;
  const integrationId_ = integration.id;
  const expiresAt = integration.expiresAt;
  const refreshTokenEnc = integration.refreshTokenEnc;

  /** Return a fresh access token, refreshing if expired. */
  async function getFreshToken(): Promise<string> {
    const notExpired =
      expiresAt && expiresAt.getTime() - Date.now() > REFRESH_SKEW_MS;
    if (notExpired) return creds.accessToken;

    if (!refreshTokenEnc) return creds.accessToken;

    const refreshToken = decryptString(refreshTokenEnc);
    const clientId = process.env.QUICKBOOKS_CLIENT_ID ?? '';
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET ?? '';

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`QuickBooks token refresh failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const tokens = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const newExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await prisma.integration.update({
      where: { id: integrationId_ },
      data: {
        credentialsEnc: encryptString(
          JSON.stringify({ accessToken: tokens.access_token, realmId: creds.realmId }),
        ),
        ...(tokens.refresh_token
          ? { refreshTokenEnc: encryptString(tokens.refresh_token) }
          : {}),
        expiresAt: newExpiresAt,
        lastSyncedAt: new Date(),
      },
    });

    creds.accessToken = tokens.access_token;
    return tokens.access_token;
  }

  async function get<T>(path: string): Promise<T> {
    const token = await getFreshToken();
    const res = await fetch(`${apiBase}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`QuickBooks ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Basic company information. */
    async getCompanyInfo() {
      const data = await get<{
        CompanyInfo: {
          CompanyName: string;
          LegalName: string;
          Country: string;
          FiscalYearStartMonth: string;
          CompanyStartDate: string;
        };
      }>('/companyinfo/' + creds.realmId);
      const c = data.CompanyInfo;
      return {
        companyName: c.CompanyName,
        legalName: c.LegalName,
        country: c.Country,
        fiscalYearStartMonth: c.FiscalYearStartMonth,
        companyStartDate: c.CompanyStartDate,
      };
    },

    /** Recent invoices ordered by date descending. */
    async getRecentInvoices(limit = 20) {
      const query = encodeURIComponent(
        `SELECT * FROM Invoice ORDERBY TxnDate DESC MAXRESULTS ${limit}`,
      );
      const data = await get<{
        QueryResponse: {
          Invoice?: {
            Id: string;
            DocNumber: string;
            TxnDate: string;
            DueDate: string;
            TotalAmt: number;
            Balance: number;
            CustomerRef: { name: string };
          }[];
        };
      }>(`/query?query=${query}`);
      return (data.QueryResponse.Invoice ?? []).map(inv => ({
        id: inv.Id,
        docNumber: inv.DocNumber,
        date: inv.TxnDate,
        dueDate: inv.DueDate,
        totalAmount: inv.TotalAmt,
        balance: inv.Balance,
        customerName: inv.CustomerRef.name,
      }));
    },

    /** Profit and loss report for the current fiscal year. */
    async getProfitAndLoss() {
      const data = await get<{
        Header: { Time: string; ReportName: string; StartPeriod: string; EndPeriod: string };
        Rows: { Row: { Summary?: { ColData: { value: string }[] }; type: string }[] };
      }>('/reports/ProfitAndLoss');
      return {
        reportName: data.Header.ReportName,
        startPeriod: data.Header.StartPeriod,
        endPeriod: data.Header.EndPeriod,
        rows: data.Rows.Row,
      };
    },
  };
}
