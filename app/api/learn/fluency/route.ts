/**
 * GET /api/learn/fluency — returns the caller's fluency scores
 * across the four Nova-operating capabilities.
 *
 * Used by /learn (the Nova Academy page) and the Monday ribbon on
 * the Environment page.
 */

import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { computeFluency } from '@/lib/learn/fluency';

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { overall, scores } = await computeFluency(identity.id);
  return Response.json({ overall, scores, sampledAt: new Date().toISOString() });
}
