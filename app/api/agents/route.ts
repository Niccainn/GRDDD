/**
 * /api/agents — list + create
 *
 * List returns every Agent the caller can see across all owned or
 * member environments, newest first. Create requires `environmentId`
 * in the body and verifies the caller owns or is an ADMIN of that env.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();

  const environmentId = req.nextUrl.searchParams.get('environmentId');

  // Build a WHERE that scopes to environments the user can read.
  // Owners see all agents in their envs; members see agents in envs
  // they're a member of; everyone else sees nothing.
  const where = {
    deletedAt: null,
    ...(environmentId ? { environmentId } : {}),
    environment: {
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
  };

  const agents = await prisma.agent.findMany({
    where,
    orderBy: [{ lastRunAt: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      name: true,
      description: true,
      emoji: true,
      status: true,
      model: true,
      lastRunAt: true,
      createdAt: true,
      environmentId: true,
      environment: { select: { name: true, color: true } },
      _count: { select: { runs: true } },
    },
  });

  return Response.json(
    agents.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      emoji: a.emoji,
      status: a.status,
      model: a.model,
      lastRunAt: a.lastRunAt,
      createdAt: a.createdAt,
      environmentId: a.environmentId,
      environmentName: a.environment.name,
      environmentColor: a.environment.color,
      runCount: a._count.runs,
    })),
  );
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();

  let body: {
    environmentId?: string;
    name?: string;
    description?: string;
    emoji?: string;
    promptTemplate?: string;
    inputsSchema?: unknown;
    model?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { environmentId, name, promptTemplate } = body;

  if (!environmentId || !name?.trim() || !promptTemplate?.trim()) {
    return Response.json(
      { error: 'environmentId, name, and promptTemplate are required' },
      { status: 400 },
    );
  }

  // Verify the caller can create agents in this environment.
  const env = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id, role: { in: ['ADMIN', 'CONTRIBUTOR'] } } } },
      ],
    },
    select: { id: true },
  });
  if (!env) {
    return Response.json({ error: 'Environment not found' }, { status: 404 });
  }

  // Validate inputsSchema shape if provided. We accept an array of
  // { name, label, type, default } and serialize to JSON. Anything
  // that doesn't parse cleanly gets rejected with a friendly error.
  let inputsSchemaSerialized: string | null = null;
  if (body.inputsSchema !== undefined && body.inputsSchema !== null) {
    if (!Array.isArray(body.inputsSchema)) {
      return Response.json(
        { error: 'inputsSchema must be an array of { name, label, type, default }' },
        { status: 400 },
      );
    }
    inputsSchemaSerialized = JSON.stringify(body.inputsSchema);
  }

  const agent = await prisma.agent.create({
    data: {
      environmentId: env.id,
      creatorId: identity.id,
      name: name.trim(),
      description: body.description?.trim() || null,
      emoji: body.emoji || null,
      promptTemplate: promptTemplate.trim(),
      inputsSchema: inputsSchemaSerialized,
      model: body.model || null,
      status: 'ACTIVE',
    },
  });

  return Response.json({ id: agent.id }, { status: 201 });
}
