/**
 * LinkedIn read client. Uses the v2 API for authenticated user
 * profile and follower statistics. OAuth2 bearer token auth.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type LinkedInCreds = { accessToken: string };

const API_BASE = 'https://api.linkedin.com/v2';

export async function getLinkedInClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'linkedin', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('LinkedIn integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as LinkedInCreds;
  const headers = {
    Authorization: `Bearer ${creds.accessToken}`,
    Accept: 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LinkedIn ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Authenticated user profile (name, headline, vanity name). */
    async getProfile() {
      const data = await get<{
        id: string;
        localizedFirstName: string;
        localizedLastName: string;
        localizedHeadline?: string;
        vanityName?: string;
        profilePicture?: {
          'displayImage~'?: { elements: { identifiers: { identifier: string }[] }[] };
        };
      }>('/me?projection=(id,localizedFirstName,localizedLastName,localizedHeadline,vanityName,profilePicture(displayImage~digitalmediaAsset:playableStreams))');
      return {
        id: data.id,
        firstName: data.localizedFirstName,
        lastName: data.localizedLastName,
        headline: data.localizedHeadline ?? null,
        vanityName: data.vanityName ?? null,
      };
    },

    /** Follower count for the authenticated user's organizational page. */
    async getFollowerCount() {
      // First get the user's organization associations
      const orgs = await get<{
        elements: { organizationalTarget: string; role: string }[];
      }>('/organizationalEntityAcls?q=roleAssignee&projection=(elements*(organizationalTarget,role))');

      if (orgs.elements.length === 0) {
        return { organizationId: null, followersCount: 0 };
      }

      // Use the first organization
      const orgUrn = orgs.elements[0].organizationalTarget;
      const orgId = orgUrn.split(':').pop()!;

      const stats = await get<{
        firstDegreeSize: number;
      }>(`/networkSizes/${orgUrn}?edgeType=CompanyFollowedByMember`);

      return {
        organizationId: orgId,
        followersCount: stats.firstDegreeSize,
      };
    },
  };
}
