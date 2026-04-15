/**
 * POST /api/agents/orchestrate — build and preview an orchestration plan
 * POST /api/agents/orchestrate/handoffs — manage agent-to-agent handoffs
 */
import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { buildPlan, getInvocableAgents, createHandoff, removeHandoff } from '@/lib/orchestrator';

/**
 * POST /api/agents/orchestrate
 * Body: { agentId: string, input: string }
 * Returns: orchestration plan with steps
 */
export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { agentId, input } = await req.json();

  if (!agentId || !input?.trim()) {
    return Response.json({ error: 'agentId and input are required' }, { status: 400 });
  }

  try {
    const plan = await buildPlan(agentId, input.trim());
    return Response.json({ plan });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to build plan' }, { status: 400 });
  }
}

/**
 * GET /api/agents/orchestrate?agentId=xxx — get handoffs for an agent
 */
export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!agentId) return Response.json({ error: 'agentId required' }, { status: 400 });

  const invocable = await getInvocableAgents(agentId);
  return Response.json({ handoffs: invocable });
}

/**
 * PUT /api/agents/orchestrate — create a handoff
 * Body: { callerId, calleeId, trigger?, condition?, passContext?, passMemory? }
 */
export async function PUT(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { callerId, calleeId, trigger, condition, passContext, passMemory } = await req.json();

  if (!callerId || !calleeId) {
    return Response.json({ error: 'callerId and calleeId are required' }, { status: 400 });
  }

  if (callerId === calleeId) {
    return Response.json({ error: 'An agent cannot hand off to itself' }, { status: 400 });
  }

  try {
    const handoff = await createHandoff({ callerId, calleeId, trigger, condition, passContext, passMemory });
    return Response.json({ handoff }, { status: 201 });
  } catch {
    return Response.json({ error: 'Handoff already exists or agent not found' }, { status: 409 });
  }
}

/**
 * DELETE /api/agents/orchestrate — remove a handoff
 * Body: { callerId, calleeId }
 */
export async function DELETE(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { callerId, calleeId } = await req.json();

  if (!callerId || !calleeId) {
    return Response.json({ error: 'callerId and calleeId are required' }, { status: 400 });
  }

  await removeHandoff(callerId, calleeId);
  return Response.json({ ok: true });
}
