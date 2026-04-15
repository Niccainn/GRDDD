import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

type ApprovalStep = {
  order: number;
  approverId: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  comment?: string;
  decidedAt?: string;
};

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? undefined;
  const entityType = searchParams.get('type') ?? undefined;
  const role = searchParams.get('role') ?? undefined;
  const envId = searchParams.get('envId') ?? undefined;

  const approvals = await prisma.approvalRequest.findMany({
    where: {
      ...(envId ? { environmentId: envId } : {}),
      ...(status ? { status } : {}),
      ...(entityType ? { entityType } : {}),
      ...(role === 'requester' ? { requesterId: identity.id } : {}),
    },
    include: {
      requester: { select: { id: true, name: true, avatar: true } },
      environment: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  let results = approvals.map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    entityType: a.entityType,
    entityId: a.entityId,
    status: a.status,
    priority: a.priority,
    requesterId: a.requesterId,
    requesterName: a.requester.name,
    requesterAvatar: a.requester.avatar,
    steps: JSON.parse(a.steps) as ApprovalStep[],
    currentStep: a.currentStep,
    metadata: JSON.parse(a.metadata),
    dueDate: a.dueDate?.toISOString() ?? null,
    completedAt: a.completedAt?.toISOString() ?? null,
    environmentId: a.environmentId,
    environmentName: a.environment.name,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  // For 'approver' role, filter to requests where current step's approverId matches the user
  if (role === 'approver') {
    results = results.filter(r => {
      if (r.status !== 'pending') return false;
      const currentStepData = r.steps[r.currentStep];
      return currentStepData && currentStepData.approverId === identity.id;
    });
  }

  return Response.json(results);
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { title, description, entityType, entityId, steps, priority, dueDate, environmentId } = body;

  if (!title || !entityType || !environmentId) {
    return Response.json({ error: 'Missing required fields: title, entityType, environmentId' }, { status: 400 });
  }

  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return Response.json({ error: 'At least one approval step is required' }, { status: 400 });
  }

  // Verify user has access to the environment
  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identity.id, deletedAt: null },
  });
  if (!env) {
    return Response.json({ error: 'Environment not found' }, { status: 404 });
  }

  // Build steps with order and default status
  const formattedSteps: ApprovalStep[] = steps.map((s: { approverId: string; approverName?: string }, i: number) => ({
    order: i,
    approverId: s.approverId,
    approverName: s.approverName ?? '',
    status: 'pending' as const,
    comment: '',
    decidedAt: undefined,
  }));

  const approval = await prisma.approvalRequest.create({
    data: {
      title,
      description: description ?? '',
      entityType,
      entityId: entityId ?? null,
      priority: priority ?? 'normal',
      dueDate: dueDate ? new Date(dueDate) : null,
      requesterId: identity.id,
      environmentId,
      steps: JSON.stringify(formattedSteps),
      currentStep: 0,
    },
    include: {
      requester: { select: { id: true, name: true } },
    },
  });

  return Response.json({
    id: approval.id,
    title: approval.title,
    status: approval.status,
  });
}
