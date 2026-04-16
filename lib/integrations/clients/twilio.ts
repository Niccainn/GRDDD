/**
 * Twilio read client. Uses the Twilio REST API with HTTP Basic
 * authentication (accountSid:authToken) for messages and account info.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type TwilioCreds = { accountSid: string; authToken: string };

export async function getTwilioClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'twilio', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Twilio integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as TwilioCreds;
  const apiBase = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}`;
  const basicAuth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64');
  const headers = { Authorization: `Basic ${basicAuth}`, Accept: 'application/json' };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${apiBase}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Twilio ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List recent SMS/MMS messages. */
    async listMessages(limit = 20) {
      const data = await get<{
        messages: {
          sid: string;
          from: string;
          to: string;
          body: string;
          status: string;
          direction: string;
          date_sent: string;
        }[];
      }>(`/Messages.json?PageSize=${limit}`);
      return data.messages.map(m => ({
        sid: m.sid,
        from: m.from,
        to: m.to,
        body: m.body,
        status: m.status,
        direction: m.direction,
        dateSent: m.date_sent,
      }));
    },

    /** Get current account balance. */
    async getAccountBalance() {
      const data = await get<{
        currency: string;
        balance: string;
        account_sid: string;
      }>('/Balance.json');
      return {
        currency: data.currency,
        balance: parseFloat(data.balance),
        accountSid: data.account_sid,
      };
    },
  };
}
