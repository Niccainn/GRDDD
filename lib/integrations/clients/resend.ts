/**
 * Resend client — transactional email.
 *
 * Single-purpose adapter: send an email. Read method lists recently
 * sent emails for visibility into delivery state. Write sends.
 *
 * Resend's API is simple — bearer-token auth, JSON in / JSON out.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type ResendCreds = { apiKey: string };

const API_BASE = 'https://api.resend.com';

export async function getResendClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'resend', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Resend integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as ResendCreds;
  const headers = {
    Authorization: `Bearer ${creds.apiKey}`,
    'Content-Type': 'application/json',
  };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Resend ${path} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List sender domains configured on the account — useful for
     *  showing the user which `from:` addresses they can use. */
    async listDomains() {
      const data = await get<{
        data: { id: string; name: string; status: string; created_at: string; region: string }[];
      }>('/domains');
      return data.data.map(d => ({
        id: d.id,
        name: d.name,
        status: d.status,
        createdAt: d.created_at,
        region: d.region,
      }));
    },

    /** Send an email. Write op. */
    async sendEmail(input: {
      from: string;
      to: string | string[];
      subject: string;
      html?: string;
      text?: string;
      replyTo?: string;
    }) {
      if (!input.html && !input.text) {
        throw new Error('Resend sendEmail: provide html or text body');
      }
      const res = await fetch(`${API_BASE}/emails`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          from: input.from,
          to: Array.isArray(input.to) ? input.to : [input.to],
          subject: input.subject,
          ...(input.html ? { html: input.html } : {}),
          ...(input.text ? { text: input.text } : {}),
          ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        }),
      });
      if (!res.ok) throw new Error(`Resend sendEmail failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as { id: string };
      return { id: data.id };
    },
  };
}
