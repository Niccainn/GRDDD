/**
 * PATCH /api/agents/[id]/runs/[runId]/blocks/[blockId]
 *
 * The human-in-the-loop edit surface. A user viewing an AgentRun's
 * output clicks a block and edits its content in place. We stamp
 * `editedAt` and `editedById` so future runs can retrieve the correction
 * as training signal ("last time you saw this metric you corrected it").
 *
 * Body: { content: object }
 *
 * We do NOT preserve the pre-edit content in this row — the original
 * Anthropic response is preserved in AgentRun.outputText, so the raw
 * model output is never lost.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string; blockId: string }> },
) {
  const identity = await getAuthIdentity();
  const { id: agentId, runId, blockId } = await params;

  // Verify the whole chain: block → run → agent → environment → caller.
  const block = await prisma.agentOutputBlock.findFirst({
    where: {
      id: blockId,
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
    select: { id: true },
  });
  if (!block) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (!body.content || typeof body.content !== 'object') {
    return Response.json({ error: 'content object required' }, { status: 400 });
  }

  await prisma.agentOutputBlock.update({
    where: { id: blockId },
    data: {
      content: JSON.stringify(body.content),
      editedAt: new Date(),
      editedById: identity.id,
    },
  });

  return Response.json({ ok: true });
}
