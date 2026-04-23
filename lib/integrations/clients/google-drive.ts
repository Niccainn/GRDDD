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

    /**
     * Create a text file in the user's Drive. WRITE — approval-gated
     * at the executor layer. Supports three output shapes:
     *
     *   - 'doc'      Converts markdown/plain text into a Google Doc
     *   - 'text'     Saves as a plain .txt file
     *   - 'markdown' Saves as a .md file (preserves Markdown exactly)
     *
     * Returns { id, webViewLink } so the executor can emit an
     * Artifact the user can click straight to.
     */
    async createTextFile(args: {
      name: string;
      content: string;
      format?: 'doc' | 'text' | 'markdown';
      parentFolderId?: string | null;
    }): Promise<{ id: string; webViewLink: string; mimeType: string }> {
      const format = args.format ?? 'doc';
      const uploadMime =
        format === 'doc' ? 'text/plain' : format === 'markdown' ? 'text/markdown' : 'text/plain';
      const finalMime =
        format === 'doc' ? 'application/vnd.google-apps.document' : uploadMime;
      const ext = format === 'doc' ? '' : format === 'markdown' ? '.md' : '.txt';
      const displayName = args.name.endsWith(ext) || ext === '' ? args.name : `${args.name}${ext}`;

      const metadata: Record<string, unknown> = {
        name: displayName,
        mimeType: finalMime,
      };
      if (args.parentFolderId) metadata.parents = [args.parentFolderId];

      // Multipart related upload — Drive's standard way of creating
      // a file and its metadata in one call.
      const boundary = '----grid-upload-' + Math.random().toString(36).slice(2);
      const body = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadata),
        `--${boundary}`,
        `Content-Type: ${uploadMime}`,
        '',
        args.content,
        `--${boundary}--`,
        '',
      ].join('\r\n');

      const url = new URL('https://www.googleapis.com/upload/drive/v3/files');
      url.searchParams.set('uploadType', 'multipart');
      url.searchParams.set('fields', 'id,name,mimeType,webViewLink');

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          Authorization: headers.Authorization,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(Buffer.byteLength(body)),
        },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Google Drive createTextFile failed (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as {
        id: string;
        name: string;
        mimeType: string;
        webViewLink: string;
      };
      return { id: data.id, webViewLink: data.webViewLink, mimeType: data.mimeType };
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
