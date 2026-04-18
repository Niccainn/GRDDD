import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

/**
 * GET /api/value-metering?environmentId=…
 *
 * Returns a rolling 7-day value summary for the given environment:
 * executions run, signals processed, tasks completed, estimated time
 * saved, scaffold activity. Used by the ValueMeterWidget on the
 * dashboard so the user can see GRID's week in concrete numbers.
 *
 * Zero-cost: one DB aggregate query per environment. No LLM calls.
 *
 * Why this exists: retroactive price discovery. Users who can see
 * "5h saved this week" convert to a paying plan at materially higher
 * rates than users looking at a generic "your workspace" screen.
 * Also gives the founder a sample-of-one source of truth when
 * talking to design partners: "last week, your workspace ran 23
 * workflows and triaged 47 signals."
 */

// Rough time-saved heuristic (minutes) per meaningful action.
// Intentionally conservative — users should feel the number is
// under-promising, not over-claiming. Tune once real user studies
// exist. Numbers chosen by consulting industry time-and-motion
// estimates for the equivalent manual task.
const MINUTES_PER_EXECUTION = 12;       // vs. drafting by hand
const MINUTES_PER_COMPLETED_TASK = 3;   // vs. tracking in spreadsheet
const MINUTES_PER_TRIAGED_SIGNAL = 2;   // vs. sorting inbox manually

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const environmentId = req.nextUrl.searchParams.get('environmentId');
  if (!environmentId) {
    return Response.json({ error: 'environmentId required' }, { status: 400 });
  }

  // Access check — reuse the accessibleBy helper pattern.
  const accessible = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
    select: { id: true },
  });
  if (!accessible) return Response.json({ error: 'Not found' }, { status: 404 });

  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [execCount, taskDoneCount, signalHandled, signalTotal, scaffoldCount] = await Promise.all([
    prisma.execution.count({
      where: {
        system: { environmentId },
        createdAt: { gte: weekAgo },
        status: { in: ['COMPLETED', 'SUCCESS'] },
      },
    }),
    prisma.task.count({
      where: {
        environmentId,
        completedAt: { gte: weekAgo },
      },
    }),
    prisma.signal.count({
      where: {
        environmentId,
        createdAt: { gte: weekAgo },
        status: { not: 'UNREAD' },
      },
    }),
    prisma.signal.count({
      where: { environmentId, createdAt: { gte: weekAgo } },
    }),
    prisma.masteryInsight.count({
      where: {
        environmentId,
        category: { in: ['scaffold_accepted', 'scaffold_correction'] },
        createdAt: { gte: weekAgo },
      },
    }),
  ]);

  const minutesSaved =
    execCount * MINUTES_PER_EXECUTION +
    taskDoneCount * MINUTES_PER_COMPLETED_TASK +
    signalHandled * MINUTES_PER_TRIAGED_SIGNAL;

  const signalTriagedPct = signalTotal > 0 ? Math.round((signalHandled / signalTotal) * 100) : null;

  return Response.json({
    windowDays: 7,
    executions: execCount,
    tasksCompleted: taskDoneCount,
    signalsHandled: signalHandled,
    signalsTotal: signalTotal,
    signalTriagedPct,
    scaffoldsThisWeek: scaffoldCount,
    minutesSaved,
    hoursSaved: Math.round((minutesSaved / 60) * 10) / 10,
    asOf: new Date().toISOString(),
  });
}
