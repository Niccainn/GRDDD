/**
 * GET /api/metrics/activation
 *
 * Computes the three activation metrics that matter for a zero-spend
 * growth loop:
 *
 *   1. daysToFirstAcceptedNovaAction — how long from sign-up to the
 *      first time the user approved an autonomous action (proxy for
 *      real activation, not just "signed up").
 *   2. sevenDayRetention — did the user come back within 7 days of
 *      their first session? Computed from distinct active days in
 *      AuditLog.
 *   3. overrideRate — fraction of Nova actions the user overrode or
 *      rejected over the last 30 days. Rising override rate = Nova
 *      drifting from the user's intent.
 *
 * No third-party analytics service — everything is read from the data
 * we already persist (AuditLog, IntelligenceLog, ExecutionReview,
 * ApprovalRequest).
 *
 * Scope: the caller's own identity. Admins can't peek at other users.
 * Cache: none — these are read for admin dashboards and should reflect
 * the latest writes.
 */

import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const now = Date.now();
  const since30 = new Date(now - 30 * MS_PER_DAY);
  const since7 = new Date(now - 7 * MS_PER_DAY);

  // 1 — days to first accepted Nova action.
  // Proxy: first ApprovalRequest or ExecutionReview with a positive
  // signal created by this identity. Falls back to null if never.
  const signUp = await prisma.identity.findUnique({
    where: { id: identity.id },
    select: { createdAt: true },
  });

  const firstApproval = await prisma.approvalRequest.findFirst({
    where: { requesterId: identity.id, status: 'approved' },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });
  const firstPositiveReview = await prisma.executionReview.findFirst({
    where: { reviewerId: identity.id, overallScore: { gte: 7 } },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });
  const firstAccepted =
    [firstApproval?.createdAt, firstPositiveReview?.createdAt]
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  const daysToFirstAcceptedNovaAction =
    signUp && firstAccepted
      ? Math.max(0, Math.round((firstAccepted.getTime() - signUp.createdAt.getTime()) / MS_PER_DAY))
      : null;

  // 2 — 7-day retention. Distinct calendar days with AuditLog entries
  // by this actor, measured in the 7 days following their creation.
  const since = signUp?.createdAt ?? since7;
  const window7End = new Date(Math.min(now, since.getTime() + 7 * MS_PER_DAY));
  const activityRows = await prisma.auditLog.findMany({
    where: { actorId: identity.id, createdAt: { gte: since, lt: window7End } },
    select: { createdAt: true },
    take: 500,
  });
  const distinctDays = new Set(
    activityRows.map(r => r.createdAt.toISOString().slice(0, 10))
  );
  const sevenDayRetention = distinctDays.size >= 2; // came back at least once

  // 3 — override rate over the last 30 days.
  // Denominator: ApprovalRequest + ExecutionReview records by this
  // user in the last 30d. Numerator: ones rejected or scored low.
  const [approvalAll, approvalOverride, reviewAll, reviewOverride] = await Promise.all([
    prisma.approvalRequest.count({
      where: { requesterId: identity.id, createdAt: { gte: since30 } },
    }),
    prisma.approvalRequest.count({
      where: {
        requesterId: identity.id,
        createdAt: { gte: since30 },
        status: { in: ['rejected', 'changes_requested'] },
      },
    }),
    prisma.executionReview.count({
      where: { reviewerId: identity.id, createdAt: { gte: since30 } },
    }),
    prisma.executionReview.count({
      where: {
        reviewerId: identity.id,
        createdAt: { gte: since30 },
        overallScore: { lt: 5 },
      },
    }),
  ]);
  const totalDecisions = approvalAll + reviewAll;
  const totalOverrides = approvalOverride + reviewOverride;
  const overrideRate = totalDecisions > 0 ? totalOverrides / totalDecisions : 0;

  // Trust score — inverse of override rate, floored at 0.
  const trustScore = Math.max(0, Math.round((1 - overrideRate) * 100));

  return Response.json({
    daysToFirstAcceptedNovaAction,
    sevenDayRetention,
    overrideRate: Math.round(overrideRate * 10000) / 100, // 2dp %
    trustScore,
    windowDays: 30,
    sampledAt: new Date().toISOString(),
    counts: {
      approvalRequests: approvalAll,
      approvalOverrides: approvalOverride,
      executionReviews: reviewAll,
      reviewOverrides: reviewOverride,
      distinctActiveDaysFirstWeek: distinctDays.size,
    },
  });
}
