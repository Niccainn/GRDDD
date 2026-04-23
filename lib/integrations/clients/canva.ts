/**
 * Canva read client. Uses the REST v1 API with Bearer auth.
 * Designs listing for creative asset dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type CanvaCreds = { accessToken: string };
const API_BASE = 'https://api.canva.com/rest/v1';

export async function getCanvaClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'canva', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Canva integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as CanvaCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Canva ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Canva ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /**
     * Create a blank design from a preset. WRITE — approval-gated at
     * the executor layer. Supported presets (via Connect API):
     *   doc, whiteboard, presentation, social_media_post, poster,
     *   mobile_video, video.
     * Returns { id, editUrl, viewUrl, title } for the Artifact.
     */
    async createDesign(args: {
      preset?: string;
      title?: string;
    }): Promise<{ id: string; editUrl: string; viewUrl: string; title: string }> {
      const preset = args.preset ?? 'social_media_post';
      const payload: Record<string, unknown> = {
        design_type: { type: 'preset', name: preset },
      };
      if (args.title) payload.title = args.title.slice(0, 200);

      const data = await post<{
        design: {
          id: string;
          title?: string;
          urls: { edit_url: string; view_url: string };
        };
      }>('/designs', payload);
      return {
        id: data.design.id,
        editUrl: data.design.urls.edit_url,
        viewUrl: data.design.urls.view_url,
        title: data.design.title ?? args.title ?? preset,
      };
    },

    /** Recent designs. */
    async listDesigns(limit = 25) {
      const data = await get<{
        items: {
          id: string;
          title: string;
          owner: { user_id: string; display_name?: string };
          thumbnail?: { url: string; width: number; height: number };
          created_at: number;
          updated_at: number;
        }[];
      }>('/designs', { limit: String(limit) });
      return data.items.map(d => ({
        id: d.id,
        title: d.title,
        ownerId: d.owner.user_id,
        ownerName: d.owner.display_name ?? null,
        thumbnailUrl: d.thumbnail?.url ?? null,
        createdAt: new Date(d.created_at * 1000).toISOString(),
        updatedAt: new Date(d.updated_at * 1000).toISOString(),
      }));
    },

    /** Single design details. */
    async getDesign(designId: string) {
      const data = await get<{
        design: {
          id: string;
          title: string;
          owner: { user_id: string; display_name?: string };
          urls: { edit_url: string; view_url: string };
          thumbnail?: { url: string; width: number; height: number };
          created_at: number;
          updated_at: number;
        };
      }>(`/designs/${designId}`);
      return {
        id: data.design.id,
        title: data.design.title,
        ownerId: data.design.owner.user_id,
        editUrl: data.design.urls.edit_url,
        viewUrl: data.design.urls.view_url,
        thumbnailUrl: data.design.thumbnail?.url ?? null,
        createdAt: new Date(data.design.created_at * 1000).toISOString(),
        updatedAt: new Date(data.design.updated_at * 1000).toISOString(),
      };
    },
  };
}
