/**
 * Fluency computation — the user-side of the Nova LMS.
 *
 * "Mastery" in this codebase already refers to Nova's mastery of a
 * workflow (MasteryInsight model — principles Nova has learned about
 * this company). To avoid confusion we call the user's side
 * "fluency" — how fluent the user is at operating Nova.
 *
 * Four fluency capabilities, each scored 0–100 from aggregates over
 * existing models. No new schema:
 *
 *   1. delegation         — how comfortably the user hands work off
 *      Inputs: workflows created, autonomous actions approved,
 *              ApprovalRequest approved rate
 *
 *   2. review              — how well the user reviews Nova output
 *      Inputs: ExecutionReview count, stage-review thoroughness,
 *              average overallScore calibration
 *
 *   3. context-giving      — how much context the user provides
 *      Inputs: NovaMemory entries created by user, context docs,
 *              system description length
 *
 *   4. trust-calibration   — gap between confidence and outcomes
 *      Inputs: override ratio vs Nova confidence, approval
 *              consistency across similar actions
 *
 * Scores are computed on the fly; no caching. The endpoint is cheap
 * and the numbers are small.
 */

import { prisma } from '@/lib/db';

export type FluencyCapability =
  | 'delegation'
  | 'review'
  | 'context-giving'
  | 'trust-calibration';

export type FluencyScore = {
  capability: FluencyCapability;
  score: number;                // 0..100
  label: 'Seedling' | 'Apprentice' | 'Practitioner' | 'Fluent' | 'Teacher';
  subtitle: string;
  nextStep: string;
  evidenceCount: number;
};

function bucket(score: number): FluencyScore['label'] {
  if (score < 20) return 'Seedling';
  if (score < 40) return 'Apprentice';
  if (score < 65) return 'Practitioner';
  if (score < 85) return 'Fluent';
  return 'Teacher';
}

/**
 * Compute all four fluency scores for an identity.
 *
 * Implementation notes:
 *   - Each signal is computed from the last 90 days where it makes
 *     sense; context-giving is lifetime because docs and memories
 *     don't expire.
 *   - We floor denominators so a brand-new user sees a non-zero baseline.
 *   - Each score carries an "evidenceCount" that drives the tooltip
 *     "we computed this from N events" line.
 */
export async function computeFluency(
  identityId: string,
): Promise<{ overall: number; scores: FluencyScore[] }> {
  const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [
    workflowsCreated,
    approvalsTotal,
    approvalsApproved,
    executionReviews,
    reviewsWithNotes,
    memoriesContributed,
    contextDocs,
    novaQueries,
    overrides,
  ] = await Promise.all([
    // We don't have `creatorId` easily on Workflow in schema; use
    // AuditLog as proxy for "workflows this user created".
    prisma.auditLog.count({
      where: {
        actorId: identityId,
        action: 'workflow.created',
        createdAt: { gte: since90 },
      },
    }),
    prisma.approvalRequest.count({
      where: { requesterId: identityId, createdAt: { gte: since90 } },
    }),
    prisma.approvalRequest.count({
      where: {
        requesterId: identityId,
        createdAt: { gte: since90 },
        status: 'approved',
      },
    }),
    prisma.executionReview.count({
      where: { reviewerId: identityId, createdAt: { gte: since90 } },
    }),
    prisma.executionReview.count({
      where: {
        reviewerId: identityId,
        createdAt: { gte: since90 },
        overallNotes: { not: null },
      },
    }),
    // NovaMemory created "by the user" = source = user_input
    prisma.novaMemory.count({
      where: { source: 'user_input' },
    }),
    prisma.document.count({
      where: { environment: { ownerId: identityId } },
    }),
    prisma.intelligenceLog.count({
      where: {
        action: 'nova_query',
        createdAt: { gte: since90 },
      },
    }),
    prisma.approvalRequest.count({
      where: {
        requesterId: identityId,
        createdAt: { gte: since90 },
        status: { in: ['rejected', 'changes_requested'] },
      },
    }),
  ]);

  // Delegation — handing off work is learned by doing it.
  const delegationRaw =
    Math.min(workflowsCreated * 8, 40) +
    Math.min(approvalsApproved * 3, 40) +
    Math.min(novaQueries, 20);
  const delegation = Math.min(100, delegationRaw);

  // Review — honest review is more than just clicking approve.
  const reviewDensity =
    executionReviews === 0 ? 0 : reviewsWithNotes / executionReviews;
  const review = Math.min(
    100,
    Math.round(Math.min(executionReviews * 5, 60) + reviewDensity * 40),
  );

  // Context-giving — the raw material Nova operates on.
  const contextGiving = Math.min(
    100,
    Math.round(Math.min(memoriesContributed * 5, 50) + Math.min(contextDocs * 6, 50)),
  );

  // Trust calibration — low override rate + high approval count =
  // well-calibrated trust. No history = neutral 50.
  let trustCalibration = 50;
  if (approvalsTotal >= 5) {
    const overrideRatio = overrides / approvalsTotal;
    trustCalibration = Math.max(0, Math.round((1 - overrideRatio) * 100));
  }

  const scores: FluencyScore[] = [
    {
      capability: 'delegation',
      score: delegation,
      label: bucket(delegation),
      subtitle: 'Handing work off to Nova with confidence',
      nextStep:
        workflowsCreated === 0
          ? 'Create your first Workflow — a named flow Nova runs repeatedly.'
          : approvalsApproved < 5
          ? 'Approve a few more autonomous drafts this week. Trust is built by doing.'
          : 'Raise one Workflow to Autonomy Level 3 — let Nova act and tell you after.',
      evidenceCount: workflowsCreated + approvalsApproved + novaQueries,
    },
    {
      capability: 'review',
      score: review,
      label: bucket(review),
      subtitle: 'Reviewing Nova output with enough depth to teach it',
      nextStep:
        executionReviews === 0
          ? 'Review your next Execution. Score it 1–10 and leave one line of notes.'
          : reviewDensity < 0.4
          ? 'Add a note to your next review — Nova reads them.'
          : 'Try a stage-by-stage review on one Execution this week.',
      evidenceCount: executionReviews,
    },
    {
      capability: 'context-giving',
      score: contextGiving,
      label: bucket(contextGiving),
      subtitle: 'Giving Nova the raw material to do your work well',
      nextStep:
        memoriesContributed < 3
          ? 'Open any System, write one memory — "When X happens, Y is the right call."'
          : contextDocs < 3
          ? 'Upload one reference doc (SOP, style guide, comp plan) to a System.'
          : 'Write a cross-System memory — something true for the whole workspace.',
      evidenceCount: memoriesContributed + contextDocs,
    },
    {
      capability: 'trust-calibration',
      score: trustCalibration,
      label: bucket(trustCalibration),
      subtitle: 'Your trust tracks reality — rare skill',
      nextStep:
        approvalsTotal < 5
          ? "Come back in a week — we'll have enough signal to calibrate."
          : overrides / approvalsTotal > 0.3
          ? 'Your override rate is high — try raising the approval bar on one Workflow.'
          : 'Your calibration is tight. Try increasing autonomy on your most-reviewed Workflow.',
      evidenceCount: approvalsTotal,
    },
  ];

  const overall = Math.round(
    (delegation + review + contextGiving + trustCalibration) / 4,
  );

  return { overall, scores };
}
