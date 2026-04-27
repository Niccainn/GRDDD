/**
 * Adobe Creative Cloud client.
 *
 * Surface chosen for the design / marketing job-to-be-done:
 *
 *   listLibraries       — user's CC Libraries (brand books,
 *                         component sets, design systems shared
 *                         across Photoshop / Illustrator / XD)
 *   listLibraryElements — colors, character styles, graphics
 *                         inside a specific library — the brand
 *                         tokens Nova can reference when generating
 *                         on-brand assets
 *   searchStock         — Adobe Stock search; lets Nova find on-
 *                         brand photography / illustration to
 *                         attach to drafts
 *
 * Adobe's API surface is much wider (Photoshop API, Document Cloud,
 * Express, Substance) — those are deferred until a design partner
 * actually asks for them. CC Libraries + Stock cover the
 * "brand DNA" use case which is what positions GRID as a design /
 * marketing platform per the registry tagline.
 *
 * Auth: OAuth via Adobe IMS — see lib/integrations/oauth/adobe.ts.
 * The credentials blob carries the access_token + refresh_token from
 * the standard exchange flow; this client just bearer-auths to
 * api.adobe.io.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type AdobeCreds = { access_token: string; refresh_token?: string };

const API_BASE = 'https://api.adobe.io';
// Adobe Stock uses a different base — kept as a constant so the
// adapter's readers can tell at a glance which surface is which.
const STOCK_API = 'https://stock.adobe.io';

export async function getAdobeCcClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'adobe_creative_cloud', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Adobe Creative Cloud integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as AdobeCreds;
  const clientId = process.env.ADOBE_CLIENT_ID;
  if (!clientId) throw new Error('ADOBE_CLIENT_ID env var not set');

  const baseHeaders: Record<string, string> = {
    Authorization: `Bearer ${creds.access_token}`,
    'x-api-key': clientId,
    'x-product': 'grid/1.0',
    Accept: 'application/json',
  };

  async function get<T>(url: string, extraHeaders: Record<string, string> = {}): Promise<T> {
    const res = await fetch(url, {
      headers: { ...baseHeaders, ...extraHeaders },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      throw new Error(`Adobe ${new URL(url).pathname} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /**
     * Creative Cloud Libraries the connected account has access to.
     * Each library is a named collection of design tokens / assets
     * shared across CC apps.
     */
    async listLibraries(limit = 25) {
      const data = await get<{
        libraries: { id: string; name: string; modified: string; elementCount?: number }[];
      }>(`${API_BASE}/cc-libraries-api/v1/libraries?limit=${limit}`);
      return data.libraries.map(l => ({
        id: l.id,
        name: l.name,
        modifiedAt: l.modified,
        elementCount: l.elementCount ?? null,
      }));
    },

    /**
     * Elements inside a specific library — colors, character
     * styles, graphics, brushes. The element type is in the response
     * so callers can filter for a specific kind.
     */
    async listLibraryElements(libraryId: string, limit = 50) {
      const data = await get<{
        elements: { id: string; name: string; type: string; modified: string }[];
      }>(`${API_BASE}/cc-libraries-api/v1/libraries/${encodeURIComponent(libraryId)}/elements?limit=${limit}`);
      return data.elements.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        modifiedAt: e.modified,
      }));
    },

    /**
     * Adobe Stock search. Returns lightweight previews — full asset
     * licensing requires a separate API call and a license credit
     * on the connected account.
     */
    async searchStock(args: { query: string; limit?: number; orientation?: 'horizontal' | 'vertical' | 'square' }) {
      const params = new URLSearchParams({
        'search_parameters[words]': args.query,
        'search_parameters[limit]': String(args.limit ?? 12),
        'result_columns[]': 'id',
        // Pulling additional columns by appending more `result_columns[]`.
      });
      // Repeat result_columns[] for each desired field. URLSearchParams
      // collapses duplicate keys so we build the suffix manually.
      const cols = ['id', 'title', 'thumbnail_url', 'width', 'height', 'creator_name'];
      const colsSuffix = cols.map(c => `result_columns[]=${encodeURIComponent(c)}`).join('&');
      if (args.orientation) {
        params.set('search_parameters[filters][orientation]', args.orientation);
      }
      const url = `${STOCK_API}/Rest/Media/1/Search/Files?${params.toString()}&${colsSuffix}`;
      const data = await get<{
        files: {
          id: number;
          title: string;
          thumbnail_url: string;
          width: number;
          height: number;
          creator_name: string;
        }[];
        nb_results: number;
      }>(url);
      return {
        total: data.nb_results,
        results: data.files.map(f => ({
          id: f.id,
          title: f.title,
          thumbnailUrl: f.thumbnail_url,
          width: f.width,
          height: f.height,
          creator: f.creator_name,
        })),
      };
    },
  };
}
