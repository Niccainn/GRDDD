/**
 * Firebase Firestore read client. Uses Bearer auth with a Google access token.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

const API_BASE = 'https://firestore.googleapis.com/v1';

type FirebaseCreds = { accessToken: string };

export async function getFirebaseClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'firebase', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Firebase integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as FirebaseCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  return {
    integration,

    /** List root-level collection IDs for a Firestore database. */
    async listCollections(projectId: string) {
      const res = await fetch(
        `${API_BASE}/projects/${projectId}/databases/(default)/documents:listCollectionIds`,
        { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`Firebase error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { collectionIds: string[] };
    },

    /** List documents in a collection. */
    async listDocuments(projectId: string, collectionId: string, limit = 50) {
      const res = await fetch(
        `${API_BASE}/projects/${projectId}/databases/(default)/documents/${collectionId}?pageSize=${limit}`,
        { headers, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`Firebase error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { documents?: { name: string; fields: Record<string, unknown>; createTime: string; updateTime: string }[] };
    },
  };
}
