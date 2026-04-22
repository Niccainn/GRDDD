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
import { createProject, listProjects } from '@/lib/projects/store';

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
    const project = await createProject({
      environmentId,
      systemId,
      goal,
      plan,
      creatorId: identity.id,
      openingMessage: openingTrace.message,
    });
    return Response.json({ project, source }, { status: 201 });
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
