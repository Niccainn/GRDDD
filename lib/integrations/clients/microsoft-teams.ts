/**
 * Microsoft Teams read client. Uses the Microsoft Graph API v1.0
 * with OAuth2 bearer token auth for team channels and messages.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type MicrosoftTeamsCreds = { accessToken: string };

const API_BASE = 'https://graph.microsoft.com/v1.0';

export async function getMicrosoftTeamsClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'microsoft_teams', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Microsoft Teams integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as MicrosoftTeamsCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Microsoft Teams ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List channels in a team. */
    async listChannels(teamId: string) {
      const data = await get<{
        value: { id: string; displayName: string; description: string | null; membershipType: string }[];
      }>(`/teams/${teamId}/channels`);
      return data.value.map(c => ({
        id: c.id,
        name: c.displayName,
        description: c.description,
        membershipType: c.membershipType,
      }));
    },

    /** Get recent messages from a team channel. */
    async getRecentMessages(teamId: string, channelId: string, limit = 20) {
      const data = await get<{
        value: {
          id: string;
          createdDateTime: string;
          from?: { user?: { displayName: string; id: string } };
          body: { content: string; contentType: string };
        }[];
      }>(`/teams/${teamId}/channels/${channelId}/messages?$top=${limit}`);
      return data.value.map(m => ({
        id: m.id,
        createdAt: m.createdDateTime,
        from: m.from?.user?.displayName ?? null,
        fromId: m.from?.user?.id ?? null,
        body: m.body.content,
        contentType: m.body.contentType,
      }));
    },
  };
}
