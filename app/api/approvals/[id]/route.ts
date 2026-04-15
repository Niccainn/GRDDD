import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

type ApprovalStep = {
  order: number;
  approverId: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  comment?: string;
  decidedAt?: string;
};

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await ctx.params;

  const approval = await prisma.approvalRequest.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, avatar: true } },
      environment: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!approval) {
    return Response.json({ error: 'Approval not found' }, { status: 404 });
  }

  return Response.json({
    id: approval.id,
    title: approval.title,
    description: approval.description,
    entityType: approval.entityType,
    entityId: approval.entityId,
    status: approval.status,
    priority: approval.priority,
    requesterId: approval.requesterId,
    requesterName: approval.requester.name,
    requesterAvatar: approval.requester.avatar,
    steps: JSON.parse(approval.steps) as ApprovalStep[],
    currentStep: approval.currentStep,
    metadata: JSON.parse(approval.metadata),
    dueDate: approval.dueDate?.toISOString() ?? null,
    completedAt: approval.completedAt?.toISOString() ?? null,
    environmentId: approval.environmentId,
    environmentName: approval.environment.name,
    createdAt: approval.createdAt.toISOString(),
    updatedAt: approval.updatedAt.toISOString(),
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await ctx.params;
  const body = await req.json();

  const approval = await prisma.approvalRequest.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true } },
    },
  });

  if (!approval) {
    return Response.json({ error: 'Approval not found' }, { status: 404 });
  }

  const steps: ApprovalStep[] = JSON.parse(approval.steps);
  const { action, comment, title, description } = body;

  // Requester editing title/description
  if (title !== undefined || description !== undefined) {
    if (approval.requesterId !== identity.id) {
      return Response.json({ error: 'Only the requester can edit this approval' }, { status: 403 });
    }

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    return Response.json({ id: updated.id, title: updated.title });
  }

  // Approver action: approve, reject, changes_requested
  if (action) {
    const currentStepData = steps[approval.currentStep];
    if (!currentStepData || currentStepData.approverId !== identity.id) {
      return Response.json({ error: 'You are not the current approver for this step' }, { status: 403 });
    }

    if (approval.status !== 'pending') {
      return Response.json({ error: 'This approval is no longer pending' }, { status: 400 });
    }

    // Update the current step
    steps[approval.currentStep] = {
      ...currentStepData,
      status: action as ApprovalStep['status'],
      comment: comment ?? '',
      decidedAt: new Date().toISOString(),
    };

    let newStatus = approval.status;
    let newCurrentStep = approval.currentStep;
    let completedAt: Date | null = null;

    if (action === 'approved') {
      // Check if there are more steps
      if (approval.currentStep < steps.length - 1) {
        newCurrentStep = approval.currentStep + 1;
        // Status stays pending since more steps remain
      } else {
        // All steps complete
        newStatus = 'approved';
        completedAt = new Date();
      }

      const notifTitle = newStatus === 'approved'
        ? `Approval approved: ${approval.title}`
        : `Step ${approval.currentStep + 1} approved: ${approval.title}`;

      await createNotification({
        identityId: approval.requesterId,
        type: 'system_alert',
        title: notifTitle,
        body: comment ? `Comment: ${comment}` : undefined,
        href: '/approvals',
      });
    } else if (action === 'rejected') {
      newStatus = 'rejected';
      completedAt = new Date();

      await createNotification({
        identityId: approval.requesterId,
        type: 'system_alert',
        title: `Approval rejected: ${approval.title}`,
        body: comment ? `Comment: ${comment}` : undefined,
        href: '/approvals',
      });
    } else if (action === 'changes_requested') {
      newStatus = 'changes_requested';

      await createNotification({
        identityId: approval.requesterId,
        type: 'system_alert',
        title: `Changes requested: ${approval.title}`,
        body: comment ? `Comment: ${comment}` : undefined,
        href: '/approvals',
      });
    }

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        steps: JSON.stringify(steps),
        currentStep: newCurrentStep,
        status: newStatus,
        ...(completedAt ? { completedAt } : {}),
      },
    });

    return Response.json({
      id: updated.id,
      status: updated.status,
      currentStep: updated.currentStep,
    });
  }

  return Response.json({ error: 'No valid update provided' }, { status: 400 });
}
