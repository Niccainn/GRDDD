/**
 * POST /api/workflows/node-learned
 *
 * Called when a user manually edits a step in the visual builder.
 * Records the change as a NovaMemory entry so the planner learns
 * from the pattern — next time someone generates a similar
 * workflow from a prompt, Nova's plan will reflect these edits.
 *
 * This is what makes the manual-Zapier-takeover turn into
 * "automated through a prompt after learning."
 *
 * Body:
 *   { workflowId, nodeLabel, action: 'edit'|'add'|'remove',
 *     before?: string, after?: string, reason?: string }
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const workflowId = typeof body.workflowId === 'string' ? body.workflowId : null;
  const nodeLabel = typeof body.nodeLabel === 'string' ? body.nodeLabel : null;
  const action = typeof body.action === 'string' ? body.action : null;
  if (!workflowId || !nodeLabel || !action) {
    return Response.json({ error: 'workflowId, nodeLabel, action required' }, { status: 400 });
  }

  // Look up the workflow to scope the memory and verify access.
  const wf = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id } } },
        ],
      },
    },
    select: { id: true, name: true, systemId: true, environmentId: true },
  });
  if (!wf) return Response.json({ error: 'Not found' }, { status: 404 });

  const before = typeof body.before === 'string' ? body.before : null;
  const after = typeof body.after === 'string' ? body.after : null;
  const reason = typeof body.reason === 'string' ? body.reason : null;

  const content = [
    `Workflow: ${wf.name}`,
    `User ${action} the step: ${nodeLabel}`,
    before ? `Before: ${before}` : null,
    after ? `After: ${after}` : null,
    reason ? `Why: ${reason}` : null,
    'Future planner calls targeting similar workflows should factor this preference.',
  ]
    .filter(Boolean)
    .join('\n');

  await prisma.novaMemory.create({
    data: {
      type: 'learned_preference',
      category: 'workflow_pattern',
      title: `Workflow edit: ${nodeLabel}`,
      content,
      source: 'user_input',
      confidence: 0.85,
      systemId: wf.systemId,
      environmentId: wf.environmentId,
    },
  });

  return Response.json({ ok: true });
}
