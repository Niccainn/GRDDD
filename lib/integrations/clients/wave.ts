/**
 * Wave read client. Uses the public GraphQL API with Bearer auth.
 * Businesses and invoices for small business finance dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type WaveCreds = { accessToken: string };
const GRAPHQL_URL = 'https://gql.waveapps.com/graphql/public';

export async function getWaveClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'wave', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Wave integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as WaveCreds;
  const headers = {
    Authorization: `Bearer ${creds.accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Wave GraphQL failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as { data: T; errors?: { message: string }[] };
    if (json.errors?.length) throw new Error(`Wave GraphQL error: ${json.errors[0].message}`);
    return json.data;
  }

  return {
    integration,

    /** All businesses for the authenticated user. */
    async listBusinesses() {
      const data = await gql<{
        businesses: {
          edges: {
            node: { id: string; name: string; currency: { code: string }; isPersonal: boolean };
          }[];
        };
      }>(`query { businesses { edges { node { id name currency { code } isPersonal } } } }`);
      return data.businesses.edges.map(e => ({
        id: e.node.id,
        name: e.node.name,
        currency: e.node.currency.code,
        isPersonal: e.node.isPersonal,
      }));
    },

    /** Invoices for a specific business. */
    async getInvoices(businessId: string, limit = 25) {
      const data = await gql<{
        business: {
          invoices: {
            edges: {
              node: {
                id: string;
                invoiceNumber: string;
                status: string;
                total: { value: number; currency: { code: string } };
                amountDue: { value: number };
                customer: { name: string };
                createdAt: string;
                dueDate: string;
              };
            }[];
          };
        };
      }>(
        `query($businessId: ID!, $limit: Int!) {
          business(id: $businessId) {
            invoices(first: $limit, sort: [CREATED_AT_DESC]) {
              edges {
                node {
                  id invoiceNumber status
                  total { value currency { code } }
                  amountDue { value }
                  customer { name }
                  createdAt dueDate
                }
              }
            }
          }
        }`,
        { businessId, limit },
      );
      return data.business.invoices.edges.map(e => ({
        id: e.node.id,
        number: e.node.invoiceNumber,
        status: e.node.status,
        total: e.node.total.value,
        currency: e.node.total.currency.code,
        amountDue: e.node.amountDue.value,
        customer: e.node.customer.name,
        createdAt: e.node.createdAt,
        dueDate: e.node.dueDate,
      }));
    },
  };
}
