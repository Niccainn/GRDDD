/**
 * GET /api/cron/agents — heartbeat for the agent scheduler.
 *
 * Wired up via vercel.json crons (every 15 minutes by default). On
 * each tick we:
 *   1. Load every ACTIVE agent whose schedule is non-manual
 *   2. Filter to those that are due (lastRunAt + interval ≤ now)
 *   3. Fire executeAgentRun() with empty inputs, attributing the run
 *      to the agent's creator so the audit trail still has a person
 *
 * Auth: requests must carry either the Vercel cron header
 * `Authorization: Bearer <CRON_SECRET>` (Vercel injects this from the
 * CRON_SECRET env var) or our internal `?secret=<CRON_SECRET>` query
 * param for manual triggers from a dev shell. If neither matches we
 * 401 — this endpoint is fire-and-forget but still calls Anthropic
 * with real money behind it.
 *
 * The response is intentionally noisy: we report which agents we
 * picked up, which we skipped, and which threw, so the cron logs are
 * useful when something stops firing.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { executeAgentRun, AgentRunError } from '@/lib/agents/run';
import { isDue, isAutoSchedule } from '@/lib/agents/schedule';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if not configured
  const header = req.headers.get('authorization');
  if (header === `Bearer ${secret}`) return true;
  const query = req.nextUrl.searchParams.get('secret');
  if (query && query === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  // Cast to a permissive shape because Prisma's strict typing tries
  // to narrow `schedule` to literal strings.
  const candidates = await prisma.agent.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      schedule: { not: null },
    },
    select: {
      id: true,
      name: true,
      schedule: true,
      lastRunAt: true,
      createdAt: true,
      creatorId: true,
      environmentId: true,
    },
  });

  type Outcome = {
    agentId: string;
    name: string;
    status: 'fired' | 'skipped' | 'error';
    runId?: string;
    code?: string;
    message?: string;
  };
  const outcomes: Outcome[] = [];

  for (const agent of candidates) {
    if (!isAutoSchedule(agent.schedule)) {
      outcomes.push({ agentId: agent.id, name: agent.name, status: 'skipped', message: 'manual or unknown schedule' });
      continue;
    }
    if (!isDue(agent.schedule, agent.lastRunAt, agent.createdAt, now)) {
      outcomes.push({ agentId: agent.id, name: agent.name, status: 'skipped', message: 'not due yet' });
      continue;
    }

    try {
      const { runId } = await executeAgentRun({
        agentId: agent.id,
        inputs: {},
        identityId: agent.creatorId,
      });
      outcomes.push({ agentId: agent.id, name: agent.name, status: 'fired', runId });
    } catch (err) {
      const code = err instanceof AgentRunError ? err.code : 'unknown';
      const message = err instanceof Error ? err.message : 'Unknown error';
      outcomes.push({ agentId: agent.id, name: agent.name, status: 'error', code, message });
    }
  }

  return Response.json({
    tickAt: now.toISOString(),
    inspected: candidates.length,
    fired: outcomes.filter((o) => o.status === 'fired').length,
    skipped: outcomes.filter((o) => o.status === 'skipped').length,
    errors: outcomes.filter((o) => o.status === 'error').length,
    outcomes,
  });
}
