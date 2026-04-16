/**
 * Dropbox read client. Uses the v2 API with Bearer auth.
 * Dropbox uses POST with JSON bodies for most endpoints.
 * Folder listing and file search for cloud storage dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type DropboxCreds = { accessToken: string };
const API_BASE = 'https://api.dropboxapi.com/2';

export async function getDropboxClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'dropbox', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Dropbox integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as DropboxCreds;
  const headers = {
    Authorization: `Bearer ${creds.accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Dropbox ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List files and folders at a given path. */
    async listFolder(path = '', limit = 50) {
      const data = await post<{
        entries: {
          '.tag': string;
          id: string;
          name: string;
          path_display: string;
          size?: number;
          client_modified?: string;
          server_modified?: string;
        }[];
        has_more: boolean;
      }>('/files/list_folder', {
        path: path || '',
        limit,
        include_media_info: false,
        include_deleted: false,
      });
      return data.entries.map(e => ({
        id: e.id,
        name: e.name,
        path: e.path_display,
        type: e['.tag'],
        size: e.size ?? null,
        modifiedAt: e.client_modified ?? e.server_modified ?? null,
      }));
    },

    /** Search files by query. */
    async searchFiles(query: string) {
      const data = await post<{
        matches: {
          metadata: {
            metadata: {
              '.tag': string;
              id: string;
              name: string;
              path_display: string;
              size?: number;
              server_modified?: string;
            };
          };
        }[];
        has_more: boolean;
      }>('/files/search_v2', { query, options: { max_results: 25 } });
      return data.matches.map(m => ({
        id: m.metadata.metadata.id,
        name: m.metadata.metadata.name,
        path: m.metadata.metadata.path_display,
        type: m.metadata.metadata['.tag'],
        size: m.metadata.metadata.size ?? null,
        modifiedAt: m.metadata.metadata.server_modified ?? null,
      }));
    },
  };
}
