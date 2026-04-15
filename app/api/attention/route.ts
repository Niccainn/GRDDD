/**
 * GET /api/attention
 *
 * Returns the top N attention items for the authenticated identity.
 * Used by the home-page AttentionWidget to answer "what should you
 * care about right now?" without the user having to dig through
 * signals, executions, goals, and systems separately.
 *
 * Tenant-scoped via Environment.ownerId — never touches another
 * tenant's data. Uncached on purpose; the query is cheap enough
 * (4 indexed reads, ~<30ms) and the content needs to be fresh to
 * be useful as a focus-of-attention signal.
 */
import { getAuthIdentity } from '@/lib/auth';
import { getAttentionItems } from '@/lib/workspace/attention';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const identity = await getAuthIdentity();
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const limit = Math.max(1, Math.min(20, Number(limitParam) || 6));

    const items = await getAttentionItems(identity.id, limit);
    return Response.json({ items });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : 'Failed to load attention';
    return Response.json({ error: message }, { status: 500 });
  }
}
