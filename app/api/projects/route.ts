/**
 * POST /api/projects — start a new Project.
 *   body: { goal, environmentId, systemId? }
 *
 * GET /api/projects?envId=... — list Projects in an Environment.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { planProject } from '@/lib/projects/planner';
import { createProject, listProjects, writeProject } from '@/lib/projects/store';
import { runAutoChain } from '@/lib/projects/run';

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const goal = typeof body?.goal === 'string' ? body.goal.trim() : '';
  const environmentId = typeof body?.environmentId === 'string' ? body.environmentId : null;
  const systemId = typeof body?.systemId === 'string' ? body.systemId : null;
  if (!goal) return Response.json({ error: 'goal required' }, { status: 400 });
  if (!environmentId) return Response.json({ error: 'environmentId required' }, { status: 400 });

  const env = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [{ ownerId: identity.id }, { memberships: { some: { identityId: identity.id } } }],
    },
    select: { id: true },
  });
  if (!env) return Response.json({ error: 'Environment not found' }, { status: 404 });

  const { plan, source, openingTrace } = await planProject(goal);
  try {
    const created = await createProject({
      environmentId,
      systemId,
      goal,
      plan,
      creatorId: identity.id,
      openingMessage: openingTrace.message,
    });
    // Mark step 1 as running (or needs_approval) so the auto-run
    // chain has a starting point. First step's approval gate is
    // respected — if step 1 is human-gated, the chain stops
    // immediately and the user sees a gated step on the page.
    const firstStep = created.plan[0];
    if (firstStep) {
      const now = new Date().toISOString();
      created.plan[0] = {
        ...firstStep,
        status: firstStep.approval?.required ? 'needs_approval' : 'running',
        startedAt: now,
      };
    }
    // Kick off the auto-run chain so Nova starts executing
    // immediately for any non-gated first step.
    const afterRun = await runAutoChain(created);
    await writeProject(afterRun.id, afterRun);
    return Response.json({ project: afterRun, source }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not start project';
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const environmentId = req.nextUrl.searchParams.get('envId');
  if (!environmentId) return Response.json({ error: 'envId required' }, { status: 400 });

  const projects = await listProjects(environmentId, identity.id, 20);
  return Response.json({ projects });
}
