/**
 * Per-system agent management.
 *
 *   GET    — read the agent config (or null if not set)
 *   PUT    — create or update
 *   DELETE — disable (system falls back to env-wide Nova defaults)
 *
 * Ownership is enforced via the system's parent environment. Only
 * write-capable members (owner / ADMIN / CONTRIBUTOR) can mutate;
 * everyone with read access on the system can GET.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsSystem } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const AgentInput = z.object({
  name: z.string().min(1).max(60),
  persona: z.string().min(10).max(600),
  toolAllowList: z.array(z.string()).default([]),
  autonomyTier: z
    .enum(['Observe', 'Suggest', 'Act', 'Autonomous', 'Self-Direct'])
    .default('Suggest'),
});

async function guard(id: string, identityId: string) {
  return assertOwnsSystem(id, identityId);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  try {
    await guard(id, identity.id);
  } catch (e) {
    return e instanceof Response ? e : Response.json({ error: 'Not found' }, { status: 404 });
  }

  const agent = await prisma.systemAgent.findUnique({ where: { systemId: id } });
  if (!agent) return Response.json({ configured: false });

  let toolAllowList: string[] = [];
  try {
    const parsed = JSON.parse(agent.toolAllowList);
    if (Array.isArray(parsed)) toolAllowList = parsed.filter(x => typeof x === 'string');
  } catch {
    toolAllowList = [];
  }

  return Response.json({
    configured: true,
    id: agent.id,
    systemId: agent.systemId,
    name: agent.name,
    persona: agent.persona,
    toolAllowList,
    autonomyTier: agent.autonomyTier,
    updatedAt: agent.updatedAt,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  try {
    await guard(id, identity.id);
  } catch (e) {
    return e instanceof Response ? e : Response.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = AgentInput.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid agent config', issues: parsed.error.issues.slice(0, 3) },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const saved = await prisma.systemAgent.upsert({
    where: { systemId: id },
    create: {
      systemId: id,
      name: data.name,
      persona: data.persona,
      toolAllowList: JSON.stringify(data.toolAllowList),
      autonomyTier: data.autonomyTier,
    },
    update: {
      name: data.name,
      persona: data.persona,
      toolAllowList: JSON.stringify(data.toolAllowList),
      autonomyTier: data.autonomyTier,
    },
  });

  return Response.json({ configured: true, id: saved.id });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  try {
    await guard(id, identity.id);
  } catch (e) {
    return e instanceof Response ? e : Response.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.systemAgent.deleteMany({ where: { systemId: id } });
  return Response.json({ configured: false });
}
