/**
 * POST /api/agents/[id]/run — trigger a new AgentRun.
 *
 * Body: { inputs?: Record<string, string | number | boolean> }
 *
 * Synchronous v1: we run the agent and return the completed run's
 * blocks in the response. Non-streaming. Future v2 will return
 * immediately with a run id and stream block updates over SSE so the
 * UI can show reasoning + partial output in real time.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { executeAgentRun, AgentRunError } from '@/lib/agents/run';
import { rateLimitAgentRun } from '@/lib/rate-limit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();

  const rl = rateLimitAgentRun(identity.id);
  if (!rl.allowed) {
    return Response.json(
      { error: 'Too many agent runs — slow down', code: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }
  const { id } = await params;

  // Auth gate — only environment owners and CONTRIBUTOR+ members can
  // run. VIEWERs can read results but not trigger billable runs.
  const agent = await prisma.agent.findFirst({
    where: {
      id,
      deletedAt: null,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          {
            memberships: {
              some: {
                identityId: identity.id,
                role: { in: ['ADMIN', 'CONTRIBUTOR'] },
              },
            },
          },
        ],
      },
    },
    select: { id: true, status: true },
  });
  if (!agent) return Response.json({ error: 'Not found' }, { status: 404 });
  if (agent.status !== 'ACTIVE') {
    return Response.json(
      { error: `Agent is ${agent.status.toLowerCase()} — cannot run` },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const inputs = (body.inputs && typeof body.inputs === 'object') ? body.inputs : {};

  try {
    const { runId } = await executeAgentRun({
      agentId: id,
      inputs,
      identityId: identity.id,
    });

    // Return the run with its blocks so the UI can render immediately
    // without a second round-trip.
    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      include: { blocks: { orderBy: { index: 'asc' } } },
    });

    return Response.json({
      id: run!.id,
      status: run!.status,
      createdAt: run!.createdAt,
      completedAt: run!.completedAt,
      resolvedPrompt: run!.resolvedPrompt,
      outputText: run!.outputText,
      tokens: run!.tokens,
      cost: run!.cost,
      blocks: run!.blocks.map((b) => ({
        id: b.id,
        index: b.index,
        type: b.type,
        content: JSON.parse(b.content),
        editedAt: b.editedAt,
        editedById: b.editedById,
      })),
    });
  } catch (err) {
    if (err instanceof AgentRunError) {
      const statusCode = err.code === 'missing_key' ? 402
        : err.code === 'budget_exceeded' ? 402
        : err.code === 'not_found' ? 404
        : 500;
      return Response.json({ error: err.message, code: err.code }, { status: statusCode });
    }
    throw err;
  }
}
