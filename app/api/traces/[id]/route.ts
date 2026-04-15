/**
 * GET /api/traces/[id]
 *
 * Returns the full TraceRecord (including every event) for a single
 * kernel run, scoped to the authenticated tenant.
 */

import { getAuthIdentity } from '@/lib/auth';
import { loadTrace } from '@/lib/kernel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const trace = await loadTrace(id, identity.id);
  if (!trace) {
    return Response.json({ error: 'Trace not found' }, { status: 404 });
  }
  return Response.json({ trace });
}
