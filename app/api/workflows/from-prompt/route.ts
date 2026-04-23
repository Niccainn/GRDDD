/**
 * POST /api/workflows/from-prompt
 *
 * Takes a natural-language goal, runs it through the same planner
 * that Projects use, and returns { nodes, edges } shaped for the
 * Workflow visual builder. Keeps the planning brain in one place.
 *
 * Body: { goal: string }
 * Response: { nodes, edges, source, stepCount }
 */

import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { buildGraphFromPrompt } from '@/lib/workflows/from-prompt';

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const goal = typeof body?.goal === 'string' ? body.goal.trim() : '';
  if (!goal) return Response.json({ error: 'goal required' }, { status: 400 });

  try {
    const result = await buildGraphFromPrompt(goal);
    return Response.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Planner error';
    return Response.json({ error: msg }, { status: 500 });
  }
}
