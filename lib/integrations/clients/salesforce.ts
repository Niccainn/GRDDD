/**
 * Salesforce read client. Uses SOQL queries via the REST API.
 * Credentials include { accessToken, instanceUrl }; accountLabel
 * stores the Salesforce org id.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type SalesforceCreds = { accessToken: string; instanceUrl: string };

export async function getSalesforceClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'salesforce', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Salesforce integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as SalesforceCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function soql<T>(query: string): Promise<T[]> {
    const url = `${creds.instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Salesforce SOQL failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const payload = (await res.json()) as { records: T[] };
    return payload.records;
  }

  return {
    integration,

    /** Pipeline totals: open opportunities grouped by stage. */
    async getPipelineByStage() {
      const rows = await soql<{ StageName: string; expr0: number; expr1: number }>(
        'SELECT StageName, COUNT(Id), SUM(Amount) FROM Opportunity WHERE IsClosed = false GROUP BY StageName',
      );
      return rows.map(r => ({ stage: r.StageName, count: r.expr0, amount: r.expr1 ?? 0 }));
    },

    /**
     * Create a new Salesforce Lead. WRITE — Phase 6 approval-gated.
     * LastName + Company are the only required fields per the SF API;
     * email/phone/title/rating are optional bookkeeping.
     */
    async createLead(args: {
      lastName: string;
      company: string;
      firstName?: string;
      email?: string;
      phone?: string;
      title?: string;
    }): Promise<{ id: string }> {
      const body: Record<string, string> = {
        LastName: args.lastName,
        Company: args.company,
      };
      if (args.firstName) body.FirstName = args.firstName;
      if (args.email) body.Email = args.email;
      if (args.phone) body.Phone = args.phone;
      if (args.title) body.Title = args.title;
      const res = await fetch(`${creds.instanceUrl}/services/data/v60.0/sobjects/Lead`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Salesforce createLead failed (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as { id: string };
      return { id: data.id };
    },

    /** Top open opportunities by amount. */
    async getTopOpenOpportunities(limit = 10) {
      return await soql<{ Id: string; Name: string; Amount: number; StageName: string; CloseDate: string }>(
        `SELECT Id, Name, Amount, StageName, CloseDate FROM Opportunity WHERE IsClosed = false ORDER BY Amount DESC NULLS LAST LIMIT ${limit}`,
      );
    },
  };
}
