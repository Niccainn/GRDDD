import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  // Fetch workflow with access check
  const workflow = await prisma.workflow.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, name: true, stages: true, environmentId: true },
  });
  if (!workflow) return Response.json({ error: 'Not found' }, { status: 404 });

  const env = await prisma.environment.findFirst({
    where: {
      id: workflow.environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  // Fetch all reviewed executions for this workflow
  const executions = await prisma.execution.findMany({
    where: { workflowId: id },
    include: {
      review: true,
      decisionPoints: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const reviewedExecutions = executions.filter(e => e.review);
  const reviewCount = reviewedExecutions.length;

  if (reviewCount < 3) {
    return Response.json({
      ready: false,
      reviewCount,
      minimumRequired: 3,
      message: `Need ${3 - reviewCount} more reviewed runs for attribution analysis`,
    });
  }

  const stages = workflow.stages ? JSON.parse(workflow.stages) : [];

  // ─── Quality Drivers ─────────────────────────────────────────────
  const drivers: Array<{ driver: string; impact: number; direction: string }> = [];

  // Input length correlation
  const inputLengths = reviewedExecutions.map(e => ({
    length: e.input.length,
    score: e.review!.overallScore,
  }));
  const avgInputLength = inputLengths.reduce((s, i) => s + i.length, 0) / inputLengths.length;
  const longInputAvg = inputLengths.filter(i => i.length > avgInputLength).reduce((s, i) => s + i.score, 0) /
    (inputLengths.filter(i => i.length > avgInputLength).length || 1);
  const shortInputAvg = inputLengths.filter(i => i.length <= avgInputLength).reduce((s, i) => s + i.score, 0) /
    (inputLengths.filter(i => i.length <= avgInputLength).length || 1);
  const inputDelta = longInputAvg - shortInputAvg;
  if (Math.abs(inputDelta) > 0.5) {
    drivers.push({
      driver: `Runs with ${inputDelta > 0 ? 'detailed' : 'concise'} briefs (${inputDelta > 0 ? '>' : '<'}${Math.round(avgInputLength)} chars)`,
      impact: Math.round(Math.abs(inputDelta) * 10) / 10,
      direction: inputDelta > 0 ? 'positive' : 'negative',
    });
  }

  // Input quality correlation
  const withInputQuality = reviewedExecutions.filter(e => e.review!.inputQuality);
  if (withInputQuality.length >= 3) {
    const highQualityAvg = withInputQuality
      .filter(e => e.review!.inputQuality! >= 4)
      .reduce((s, e) => s + e.review!.overallScore, 0) /
      (withInputQuality.filter(e => e.review!.inputQuality! >= 4).length || 1);
    const lowQualityAvg = withInputQuality
      .filter(e => e.review!.inputQuality! <= 2)
      .reduce((s, e) => s + e.review!.overallScore, 0) /
      (withInputQuality.filter(e => e.review!.inputQuality! <= 2).length || 1);
    const qualityDelta = highQualityAvg - lowQualityAvg;
    if (Math.abs(qualityDelta) > 0.5) {
      drivers.push({
        driver: 'Higher self-rated input quality',
        impact: Math.round(Math.abs(qualityDelta) * 10) / 10,
        direction: 'positive',
      });
    }
  }

  // Time-of-day correlation
  const morningRuns = reviewedExecutions.filter(e => {
    const h = new Date(e.createdAt).getHours();
    return h >= 6 && h < 12;
  });
  const afternoonRuns = reviewedExecutions.filter(e => {
    const h = new Date(e.createdAt).getHours();
    return h >= 12 && h < 18;
  });
  if (morningRuns.length >= 2 && afternoonRuns.length >= 2) {
    const morningAvg = morningRuns.reduce((s, e) => s + e.review!.overallScore, 0) / morningRuns.length;
    const afternoonAvg = afternoonRuns.reduce((s, e) => s + e.review!.overallScore, 0) / afternoonRuns.length;
    const timeDelta = morningAvg - afternoonAvg;
    if (Math.abs(timeDelta) > 1) {
      drivers.push({
        driver: `${timeDelta > 0 ? 'Morning' : 'Afternoon'} runs perform better`,
        impact: Math.round(Math.abs(timeDelta) * 10) / 10,
        direction: 'positive',
      });
    }
  }

  // ─── Stage Performance ─────────────────────────────────────────
  const stagePerformance = stages.map((stage: { id?: string; name: string }, i: number) => {
    const stageId = stage.id || `stage-${i}`;
    const stageScores: number[] = [];
    let rewriteCount = 0;
    let criticalCount = 0;

    for (const exec of reviewedExecutions) {
      const review = exec.review!;
      if (review.stageReviews) {
        const parsed = JSON.parse(review.stageReviews);
        const stageReview = parsed.find((sr: { stageId: string }) => sr.stageId === stageId);
        if (stageReview) {
          stageScores.push(stageReview.score);
          if (stageReview.wouldRewrite) rewriteCount++;
        }
      }
      if (review.criticalStageId === stageId) criticalCount++;
    }

    return {
      stageId,
      stageName: stage.name,
      averageScore: stageScores.length > 0
        ? Math.round((stageScores.reduce((a, b) => a + b, 0) / stageScores.length) * 10) / 10
        : null,
      rewriteRate: stageScores.length > 0 ? Math.round((rewriteCount / stageScores.length) * 100) : 0,
      criticalRate: Math.round((criticalCount / reviewCount) * 100),
      reviewCount: stageScores.length,
    };
  });

  // ─── Best/Worst Runs ──────────────────────────────────────────
  const sorted = [...reviewedExecutions].sort((a, b) => b.review!.overallScore - a.review!.overallScore);
  const bestRuns = sorted.slice(0, 3).map(e => ({
    executionId: e.id,
    score: e.review!.overallScore,
    inputPreview: e.input.slice(0, 120),
    inputLength: e.input.length,
    inputQuality: e.review!.inputQuality,
    criticalStageId: e.review!.criticalStageId,
    createdAt: e.createdAt,
  }));
  const worstRuns = sorted.slice(-3).reverse().map(e => ({
    executionId: e.id,
    score: e.review!.overallScore,
    inputPreview: e.input.slice(0, 120),
    inputLength: e.input.length,
    inputQuality: e.review!.inputQuality,
    criticalStageId: e.review!.criticalStageId,
    createdAt: e.createdAt,
  }));

  // ─── Score Trend ──────────────────────────────────────────────
  const scoreTrend = reviewedExecutions.map(e => ({
    date: e.createdAt,
    score: e.review!.overallScore,
  }));

  return Response.json({
    ready: true,
    reviewCount,
    workflowName: workflow.name,
    averageScore: Math.round((reviewedExecutions.reduce((s, e) => s + e.review!.overallScore, 0) / reviewCount) * 10) / 10,
    drivers,
    stagePerformance,
    bestRuns,
    worstRuns,
    scoreTrend,
  });
}
