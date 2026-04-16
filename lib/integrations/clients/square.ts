/**
 * Square read client. Uses the Connect v2 API with Bearer auth.
 * Payments and locations for POS revenue visibility.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type SquareCreds = { accessToken: string };
const API_BASE = 'https://connect.squareup.com/v2';

export async function getSquareClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'square', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Square integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as SquareCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Square ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Recent payments. */
    async listPayments(limit = 25) {
      const data = await get<{
        payments?: {
          id: string;
          amount_money: { amount: number; currency: string };
          status: string;
          created_at: string;
          source_type: string;
        }[];
      }>('/payments', { limit: String(limit), sort_order: 'DESC' });
      return (data.payments ?? []).map(p => ({
        id: p.id,
        amount: p.amount_money.amount / 100,
        currency: p.amount_money.currency,
        status: p.status,
        sourceType: p.source_type,
        createdAt: p.created_at,
      }));
    },

    /** All business locations. */
    async listLocations() {
      const data = await get<{
        locations?: {
          id: string;
          name: string;
          status: string;
          address?: { locality: string; country: string };
        }[];
      }>('/locations');
      return (data.locations ?? []).map(l => ({
        id: l.id,
        name: l.name,
        status: l.status,
        city: l.address?.locality ?? null,
        country: l.address?.country ?? null,
      }));
    },
  };
}
