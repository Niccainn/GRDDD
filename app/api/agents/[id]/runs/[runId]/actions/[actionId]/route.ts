/**
 * POST /api/agents/[id]/runs/[runId]/actions/[actionId] —
 * approve or reject a PendingAction created by the Phase 5 write
 * gate. Body: { decision: 'approve' | 'reject', reason?: string }.
 *
 * When the last PENDING action on the run is decided, the resume
 * helper kicks in synchronously: approved actions get executed,
 * rejected ones become tool_results with is_error: true, and the
 * agent's tool-use loop re-enters Anthropic to either finish or
 * pause again on the next batch of writes.
 *
 * Returns the run with its updated blocks so the UI can swap state
 * without a second round-trip — same shape as POST /run.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resumeAgentRun, AgentRunError } from '@/lib/agents/run';
import { audit } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string; actionId: string }> },
) {
  const identity = await getAuthIdentity();
  const { id: agentId, runId, actionId } = await params;

  // Auth gate — only owners + ADMIN/CONTRIBUTOR members can decide
  // pending actions. VIEWERs see them but cannot approve/reject.
  const action = await prisma.pendingAction.findFirst({
    where: {
      id: actionId,
      runId,
      run: {
        agentId,
        agent: {
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
      },
    },
  });
  if (!action) return Response.json({ error: 'Not found' }, { status: 404 });

  if (action.status !== 'PENDING') {
    return Response.json(
      { error: `Action is ${action.status.toLowerCase()} — already decided` },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const decision = body.decision;
  if (decision !== 'approve' && decision !== 'reject') {
    return Response.json(
      { error: 'decision must be "approve" or "reject"' },
      { status: 400 },
    );
  }
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 1000) : null;

  await prisma.pendingAction.update({
    where: { id: actionId },
    data: {
      status: decision === 'approve' ? 'APPROVED' : 'REJECTED',
      decidedAt: new Date(),
      decidedById: identity.id,
      decisionReason: reason,
    },
  });

  audit({
    action: decision === 'approve' ? 'agent.action.approved' : 'agent.action.rejected',
    entity: 'pending_action',
    entityId: actionId,
    entityName: action.summary,
    actorId: identity.id,
    actorName: identity.name,
    metadata: {
      runId,
      agentId,
      provider: action.provider,
      toolName: action.toolName,
      reason: reason ?? undefined,
    },
  });

  // If any siblings are still PENDING, the run stays paused. Just
  // return the updated run state so the UI can show the new badge.
  const stillPending = await prisma.pendingAction.count({
    where: { runId, status: 'PENDING' },
  });

  if (stillPending === 0) {
    try {
      await resumeAgentRun({ runId, identityId: identity.id });
    } catch (err) {
      if (err instanceof AgentRunError) {
        // Resume already marked the run FAILED — surface the error to
        // the UI but still return the run shape so the page updates.
        return Response.json(
          { error: err.message, code: err.code },
          { status: err.code === 'not_found' ? 404 : 500 },
        );
      }
      throw err;
    }
  }

  // Reload the run with its blocks for the response — same shape as
  // POST /run so the client can replace state with this payload.
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    include: { blocks: { orderBy: { index: 'asc' } } },
  });
  if (!run) return Response.json({ error: 'Run vanished' }, { status: 404 });

  return Response.json({
    id: run.id,
    status: run.status,
    createdAt: run.createdAt,
    completedAt: run.completedAt,
    resolvedPrompt: run.resolvedPrompt,
    outputText: run.outputText,
    tokens: run.tokens,
    cost: run.cost,
    error: run.error,
    blocks: run.blocks.map((b) => ({
      id: b.id,
      index: b.index,
      type: b.type,
      content: JSON.parse(b.content),
      editedAt: b.editedAt,
      editedById: b.editedById,
    })),
  });
}
