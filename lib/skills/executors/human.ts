/**
 * human.* executors — steps explicitly designed to pause for a human.
 *
 * Creates an ApprovalRequest tied to the step, leaves the step in
 * needs_approval status. The PATCH approve op on /api/projects/[id]
 * is what advances it past this gate.
 */

import { prisma } from '@/lib/db';
import type { Executor, ExecutorResult } from './types';

export const humanReview: Executor = async ({ step, project }) => {
  const now = new Date().toISOString();

  // Create a backing ApprovalRequest so this step shows up in the
  // approvals queue and the audit log.
  const existingId = step.approval?.approvalRequestId;
  let approvalRequestId = existingId;
  if (!approvalRequestId) {
    try {
      const approval = await prisma.approvalRequest.create({
        data: {
          title: `Project review — ${step.title}`,
          description: `${step.rationale}\n\nPart of project: ${project.goal}`,
          entityType: 'project_step',
          entityId: `${project.id}:${step.id}`,
          status: 'pending',
          priority: 'normal',
          requesterId: '', // Filled by the route caller when available.
          environmentId: project.environmentId,
          steps: JSON.stringify([
            {
              name: step.title,
              reviewer: null,
              status: 'pending',
            },
          ]),
          currentStep: 0,
          metadata: JSON.stringify({ projectId: project.id, stepId: step.id }),
        },
        select: { id: true },
      });
      approvalRequestId = approval.id;
    } catch {
      /* best-effort — the gate still works via the step.approval flag */
    }
  }

  return {
    step: {
      ...step,
      status: 'needs_approval',
      approval: {
        required: true,
        reason: step.approval?.reason ?? 'Human review required before proceeding.',
        approvalRequestId: approvalRequestId ?? null,
      },
    },
    artifacts: [],
    trace: [
      {
        stepId: step.id,
        source: 'system',
        message: 'Paused for human review. Approve the step to continue.',
      },
    ],
    mode: 'human_gate',
  };
};
