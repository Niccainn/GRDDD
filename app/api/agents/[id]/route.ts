/**
 * /api/agents/[id] — get, patch, delete a single agent
 *
 * GET returns the agent including its recent runs + each run's output
 * blocks, so the detail page can render everything from one request.
 * PATCH updates mutable fields (name, description, promptTemplate,
 * model, status, inputsSchema). DELETE soft-deletes.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function loadAgentForIdentity(agentId: string, identityId: string) {
  return prisma.agent.findFirst({
    where: {
      id: agentId,
      deletedAt: null,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identityId },
          { memberships: { some: { identityId } } },
        ],
      },
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const agent = await prisma.agent.findFirst({
    where: {
      id,
      deletedAt: null,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id } } },
        ],
      },
    },
    include: {
      environment: { select: { id: true, name: true, color: true } },
      runs: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          blocks: { orderBy: { index: 'asc' } },
        },
      },
    },
  });

  if (!agent) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    emoji: agent.emoji,
    promptTemplate: agent.promptTemplate,
    inputsSchema: agent.inputsSchema ? JSON.parse(agent.inputsSchema) : [],
    model: agent.model,
    schedule: agent.schedule ?? 'manual',
    status: agent.status,
    lastRunAt: agent.lastRunAt,
    createdAt: agent.createdAt,
    environment: agent.environment,
    runs: agent.runs.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      resolvedPrompt: r.resolvedPrompt,
      inputs: r.inputs ? JSON.parse(r.inputs) : null,
      outputText: r.outputText,
      tokens: r.tokens,
      cost: r.cost,
      error: r.error,
      blocks: r.blocks.map((b) => ({
        id: b.id,
        index: b.index,
        type: b.type,
        content: JSON.parse(b.content),
        editedAt: b.editedAt,
        editedById: b.editedById,
      })),
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const existing = await loadAgentForIdentity(id, identity.id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === 'string') data.description = body.description.trim() || null;
  if (typeof body.emoji === 'string') data.emoji = body.emoji || null;
  if (typeof body.promptTemplate === 'string' && body.promptTemplate.trim()) {
    data.promptTemplate = body.promptTemplate.trim();
  }
  if (typeof body.model === 'string') data.model = body.model || null;
  if (typeof body.status === 'string' && ['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(body.status)) {
    data.status = body.status;
  }
  if (typeof body.schedule === 'string') {
    const validSchedules = ['manual', 'every_15m', 'every_hour', 'every_4h', 'daily', 'weekly'];
    if (validSchedules.includes(body.schedule)) {
      data.schedule = body.schedule;
    } else {
      return Response.json(
        { error: `schedule must be one of: ${validSchedules.join(', ')}` },
        { status: 400 },
      );
    }
  }
  if (body.inputsSchema !== undefined) {
    if (body.inputsSchema === null) {
      data.inputsSchema = null;
    } else if (Array.isArray(body.inputsSchema)) {
      data.inputsSchema = JSON.stringify(body.inputsSchema);
    } else {
      return Response.json(
        { error: 'inputsSchema must be an array or null' },
        { status: 400 },
      );
    }
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  await prisma.agent.update({ where: { id }, data });
  return Response.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const existing = await loadAgentForIdentity(id, identity.id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  // Soft delete — the agent disappears from lists but the row and all
  // its runs/blocks are preserved for audit + potential undo.
  await prisma.agent.update({ where: { id }, data: { deletedAt: new Date() } });
  return Response.json({ ok: true });
}
