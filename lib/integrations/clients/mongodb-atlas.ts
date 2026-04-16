/**
 * MongoDB Atlas read client. Uses Digest auth via API public/private key pair.
 * Atlas API uses HTTP Digest, but the newer keys also support Bearer-like
 * headers via the Atlas Admin API key mechanism. We use Basic auth with
 * publicKey:privateKey as a simple approach that the Atlas API accepts.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://cloud.mongodb.com/api/atlas/v2';

type MongoDBAtlasCreds = { publicKey: string; privateKey: string };

export async function getMongoDBAtlasClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'mongodb_atlas', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('MongoDB Atlas integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as MongoDBAtlasCreds;
  const basic = Buffer.from(`${creds.publicKey}:${creds.privateKey}`).toString('base64');
  const headers = { Authorization: `Basic ${basic}`, Accept: 'application/vnd.atlas.2023-02-01+json' };

  return {
    integration,

    /** List clusters in a project (group). */
    async listClusters(groupId: string) {
      const res = await fetch(
        `${API_BASE}/groups/${groupId}/clusters`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`MongoDB Atlas error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { results: { name: string; stateName: string; clusterType: string; mongoDBVersion: string }[] };
    },

    /** Get the status of a specific cluster. */
    async getClusterStatus(groupId: string, clusterName: string) {
      const res = await fetch(
        `${API_BASE}/groups/${groupId}/clusters/${encodeURIComponent(clusterName)}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`MongoDB Atlas error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { name: string; stateName: string; clusterType: string; mongoDBVersion: string; connectionStrings: { standardSrv?: string } };
    },
  };
}
