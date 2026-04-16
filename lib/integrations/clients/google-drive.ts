/**
 * Google Drive read client. Uses the Drive v3 API with Bearer auth.
 * Recent files and search for cloud storage dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type GoogleDriveCreds = { accessToken: string };
const API_BASE = 'https://www.googleapis.com/drive/v3';

export async function getGoogleDriveClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'google_drive', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Google Drive integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as GoogleDriveCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Drive ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  const FILE_FIELDS = 'id,name,mimeType,size,webViewLink,iconLink,modifiedTime,createdTime,owners';

  return {
    integration,

    /** Recently modified files. */
    async listRecentFiles(limit = 25) {
      const data = await get<{
        files: {
          id: string;
          name: string;
          mimeType: string;
          size?: string;
          webViewLink: string;
          modifiedTime: string;
          createdTime: string;
          owners?: { displayName: string; emailAddress: string }[];
        }[];
      }>('/files', {
        pageSize: String(limit),
        orderBy: 'modifiedTime desc',
        fields: `files(${FILE_FIELDS})`,
        q: 'trashed = false',
      });
      return data.files.map(f => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size ? Number(f.size) : null,
        webViewLink: f.webViewLink,
        modifiedAt: f.modifiedTime,
        createdAt: f.createdTime,
        owner: f.owners?.[0]?.displayName ?? null,
      }));
    },

    /** Search files by query string. */
    async searchFiles(query: string, limit = 25) {
      const data = await get<{
        files: {
          id: string;
          name: string;
          mimeType: string;
          size?: string;
          webViewLink: string;
          modifiedTime: string;
        }[];
      }>('/files', {
        pageSize: String(limit),
        fields: `files(${FILE_FIELDS})`,
        q: `name contains '${query.replace(/'/g, "\\'")}' and trashed = false`,
      });
      return data.files.map(f => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size ? Number(f.size) : null,
        webViewLink: f.webViewLink,
        modifiedAt: f.modifiedTime,
      }));
    },
  };
}
