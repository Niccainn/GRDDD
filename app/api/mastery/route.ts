import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const { searchParams } = new URL(req.url);
  const environmentId = searchParams.get('environmentId');
  const workflowId = searchParams.get('workflowId');

  if (!environmentId) {
    return Response.json({ error: 'environmentId required' }, { status: 400 });
  }

  // Verify access
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

  const where: Record<string, unknown> = { environmentId };
  if (workflowId) where.workflowId = workflowId;

  const insights = await prisma.masteryInsight.findMany({
    where,
    orderBy: { strength: 'desc' },
    take: 20,
  });

  // Also fetch review stats for learning curve
  const reviews = await prisma.executionReview.findMany({
    where: { environmentId },
    orderBy: { createdAt: 'asc' },
    select: { overallScore: true, createdAt: true, inputQuality: true },
  });

  // Calculate rolling average (window of 5)
  const learningCurve = reviews.map((r, i) => {
    const window = reviews.slice(Math.max(0, i - 4), i + 1);
    const avg = window.reduce((s, w) => s + w.overallScore, 0) / window.length;
    return {
      date: r.createdAt,
      score: r.overallScore,
      rollingAverage: Math.round(avg * 10) / 10,
    };
  });

  return Response.json({
    insights: insights.map(i => ({
      ...i,
      evidence: JSON.parse(i.evidence),
    })),
    learningCurve,
    totalReviews: reviews.length,
    averageScore: reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.overallScore, 0) / reviews.length) * 10) / 10
      : null,
  });
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const body = await req.json();
  const { environmentId } = body;

  if (!environmentId) {
    return Response.json({ error: 'environmentId required' }, { status: 400 });
  }

  // Verify access
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

  // Generate mastery insights from reviewed executions
  const reviews = await prisma.executionReview.findMany({
    where: { environmentId },
    include: {
      execution: {
        select: { id: true, input: true, workflowId: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (reviews.length < 3) {
    return Response.json({
      generated: 0,
      message: `Need ${3 - reviews.length} more reviews to generate insights`,
    });
  }

  const insights: Array<{
    principle: string;
    evidence: Array<{ executionId: string; score: number; detail: string }>;
    category: string;
    strength: number;
    runsAnalyzed: number;
    workflowId: string | null;
  }> = [];

  // ─── Input Pattern Analysis ────────────────────────────────────
  const avgLength = reviews.reduce((s, r) => s + r.execution.input.length, 0) / reviews.length;
  const longInputReviews = reviews.filter(r => r.execution.input.length > avgLength * 1.5);
  const shortInputReviews = reviews.filter(r => r.execution.input.length < avgLength * 0.5);

  if (longInputReviews.length >= 2 && shortInputReviews.length >= 2) {
    const longAvg = longInputReviews.reduce((s, r) => s + r.overallScore, 0) / longInputReviews.length;
    const shortAvg = shortInputReviews.reduce((s, r) => s + r.overallScore, 0) / shortInputReviews.length;
    if (Math.abs(longAvg - shortAvg) > 1) {
      insights.push({
        principle: longAvg > shortAvg
          ? `Detailed briefs (${Math.round(avgLength * 1.5)}+ chars) produce higher quality output`
          : `Concise briefs perform better than lengthy ones`,
        evidence: (longAvg > shortAvg ? longInputReviews : shortInputReviews).slice(0, 3).map(r => ({
          executionId: r.execution.id,
          score: r.overallScore,
          detail: `Input: ${r.execution.input.slice(0, 80)}...`,
        })),
        category: 'input_pattern',
        strength: Math.min(1, Math.abs(longAvg - shortAvg) / 5),
        runsAnalyzed: reviews.length,
        workflowId: null,
      });
    }
  }

  // ─── Quality Self-Awareness ─────────────────────────────────────
  const withInputQuality = reviews.filter(r => r.inputQuality);
  if (withInputQuality.length >= 3) {
    const highSelfRated = withInputQuality.filter(r => r.inputQuality! >= 4);
    const lowSelfRated = withInputQuality.filter(r => r.inputQuality! <= 2);
    if (highSelfRated.length >= 2 && lowSelfRated.length >= 1) {
      const highAvg = highSelfRated.reduce((s, r) => s + r.overallScore, 0) / highSelfRated.length;
      const lowAvg = lowSelfRated.reduce((s, r) => s + r.overallScore, 0) / lowSelfRated.length;
      if (highAvg - lowAvg > 0.5) {
        insights.push({
          principle: 'Your confidence in your brief predicts output quality — trust your instinct on input readiness',
          evidence: highSelfRated.slice(0, 3).map(r => ({
            executionId: r.execution.id,
            score: r.overallScore,
            detail: `Self-rated input: ${r.inputQuality}/5, output: ${r.overallScore}/10`,
          })),
          category: 'quality_driver',
          strength: Math.min(1, (highAvg - lowAvg) / 4),
          runsAnalyzed: withInputQuality.length,
          workflowId: null,
        });
      }
    }
  }

  // ─── Per-Workflow Stage Patterns ────────────────────────────────
  const byWorkflow = new Map<string, typeof reviews>();
  for (const r of reviews) {
    if (!r.execution.workflowId) continue;
    const wfReviews = byWorkflow.get(r.execution.workflowId) || [];
    wfReviews.push(r);
    byWorkflow.set(r.execution.workflowId, wfReviews);
  }

  for (const [wfId, wfReviews] of byWorkflow) {
    if (wfReviews.length < 3) continue;

    // Find stages that are consistently flagged as critical
    const criticalCounts = new Map<string, number>();
    for (const r of wfReviews) {
      if (r.criticalStageId) {
        criticalCounts.set(r.criticalStageId, (criticalCounts.get(r.criticalStageId) || 0) + 1);
      }
    }

    for (const [stageId, count] of criticalCounts) {
      const rate = count / wfReviews.length;
      if (rate >= 0.4) {
        insights.push({
          principle: `Stage "${stageId}" is consistently the quality bottleneck — ${Math.round(rate * 100)}% of runs identify it as the critical stage`,
          evidence: wfReviews.filter(r => r.criticalStageId === stageId).slice(0, 3).map(r => ({
            executionId: r.execution.id,
            score: r.overallScore,
            detail: `Identified "${stageId}" as critical`,
          })),
          category: 'stage_pattern',
          strength: Math.min(1, rate),
          runsAnalyzed: wfReviews.length,
          workflowId: wfId,
        });
      }
    }

    // Score improvement trend
    const firstHalf = wfReviews.slice(0, Math.floor(wfReviews.length / 2));
    const secondHalf = wfReviews.slice(Math.floor(wfReviews.length / 2));
    if (firstHalf.length >= 2 && secondHalf.length >= 2) {
      const firstAvg = firstHalf.reduce((s, r) => s + r.overallScore, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, r) => s + r.overallScore, 0) / secondHalf.length;
      if (secondAvg - firstAvg > 0.5) {
        insights.push({
          principle: `Your output quality is improving — recent runs score ${Math.round((secondAvg - firstAvg) * 10) / 10} points higher than early runs`,
          evidence: secondHalf.slice(-3).map(r => ({
            executionId: r.execution.id,
            score: r.overallScore,
            detail: `Recent run: ${r.overallScore}/10`,
          })),
          category: 'quality_driver',
          strength: Math.min(1, (secondAvg - firstAvg) / 3),
          runsAnalyzed: wfReviews.length,
          workflowId: wfId,
        });
      }
    }
  }

  // ─── Persist Insights ──────────────────────────────────────────
  // Delete existing insights for this environment and recreate
  await prisma.masteryInsight.deleteMany({ where: { environmentId } });

  if (insights.length > 0) {
    await prisma.masteryInsight.createMany({
      data: insights.map(i => ({
        principle: i.principle,
        evidence: JSON.stringify(i.evidence),
        category: i.category,
        strength: i.strength,
        runsAnalyzed: i.runsAnalyzed,
        workflowId: i.workflowId,
        environmentId,
      })),
    });
  }

  return Response.json({ generated: insights.length }, { status: 201 });
}
