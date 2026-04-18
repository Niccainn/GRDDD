import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const review = await prisma.executionReview.findUnique({
    where: { executionId: id },
    include: {
      execution: {
        select: { systemId: true, workflowId: true, system: { select: { environmentId: true } } },
      },
    },
  });

  if (!review) return Response.json(null);

  // Verify environment access
  const env = await prisma.environment.findFirst({
    where: {
      id: review.environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({
    ...review,
    stageReviews: review.stageReviews ? JSON.parse(review.stageReviews) : null,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const body = await req.json();
  const { overallScore, overallNotes, stageReviews, criticalStageId, inputQuality } = body;

  if (!overallScore || overallScore < 1 || overallScore > 10) {
    return Response.json({ error: 'overallScore must be 1-10' }, { status: 400 });
  }

  if (inputQuality !== undefined && inputQuality !== null && (inputQuality < 1 || inputQuality > 5)) {
    return Response.json({ error: 'inputQuality must be 1-5' }, { status: 400 });
  }

  // Fetch execution with environment access check
  const execution = await prisma.execution.findUnique({
    where: { id },
    include: { system: { select: { environmentId: true } } },
  });
  if (!execution) return Response.json({ error: 'Execution not found' }, { status: 404 });

  const environmentId = execution.system.environmentId;
  const env = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  // Check for existing review
  const existing = await prisma.executionReview.findUnique({
    where: { executionId: id },
  });
  if (existing) {
    return Response.json({ error: 'Review already exists for this execution' }, { status: 409 });
  }

  const review = await prisma.executionReview.create({
    data: {
      overallScore,
      overallNotes: overallNotes ?? null,
      stageReviews: stageReviews ? JSON.stringify(stageReviews) : null,
      criticalStageId: criticalStageId ?? null,
      inputQuality: inputQuality ?? null,
      executionId: id,
      reviewerId: identity.id,
      environmentId,
    },
  });

  return Response.json(review, { status: 201 });
}
