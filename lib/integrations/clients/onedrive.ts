/**
 * OneDrive read client. Uses the Microsoft Graph API with Bearer auth.
 * Recent files and search for cloud storage dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type OneDriveCreds = { accessToken: string };
const API_BASE = 'https://graph.microsoft.com/v1.0/me/drive';

export async function getOneDriveClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'onedrive', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('OneDrive integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as OneDriveCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OneDrive ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  type DriveItem = {
    id: string;
    name: string;
    size: number;
    webUrl: string;
    file?: { mimeType: string };
    folder?: { childCount: number };
    lastModifiedDateTime: string;
    createdDateTime: string;
    lastModifiedBy?: { user: { displayName: string } };
  };

  function mapItem(item: DriveItem) {
    return {
      id: item.id,
      name: item.name,
      size: item.size,
      webUrl: item.webUrl,
      mimeType: item.file?.mimeType ?? null,
      isFolder: !!item.folder,
      childCount: item.folder?.childCount ?? null,
      modifiedAt: item.lastModifiedDateTime,
      createdAt: item.createdDateTime,
      modifiedBy: item.lastModifiedBy?.user.displayName ?? null,
    };
  }

  return {
    integration,

    /** Recently accessed files. */
    async listRecentFiles(limit = 25) {
      const data = await get<{ value: DriveItem[] }>('/recent', { $top: String(limit) });
      return data.value.map(mapItem);
    },

    /** Search files by query. */
    async searchFiles(query: string) {
      const data = await get<{ value: DriveItem[] }>(`/root/search(q='${encodeURIComponent(query)}')`);
      return data.value.map(mapItem);
    },
  };
}
