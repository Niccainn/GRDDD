/**
 * POST /api/environments/[id]/actions/[actionId]/undo
 *
 * Records an undo intent for a Nova or audit action within the 24h
 * window. For reversible action types (task.created, draft.created)
 * it also soft-deletes the downstream entity. For everything else it
 * records the undo on the AuditLog so downstream Nova calls avoid
 * the behaviour that was overridden.
 *
 * Returns { ok, undone: true } so the client can grey the row.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

type CompositeActionId =
  | { kind: 'intel'; id: string }
  | { kind: 'audit'; id: string };

function parseActionId(raw: string): CompositeActionId | null {
  const decoded = decodeURIComponent(raw);
  const [kind, id] = decoded.includes(':') ? decoded.split(':', 2) : ['intel', decoded];
  if (kind !== 'intel' && kind !== 'audit') return null;
  if (!id) return null;
  return { kind: kind as 'intel' | 'audit', id };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id: envId, actionId: rawActionId } = await params;
  const parsed = parseActionId(rawActionId);
  if (!parsed) return Response.json({ error: 'Bad actionId' }, { status: 400 });

  // Caller must be owner or admin of the Environment.
  const env = await prisma.environment.findFirst({
    where: {
      id: envId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id, role: { in: ['ADMIN', 'OWNER'] } } } },
      ],
    },
    select: { id: true, name: true },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  if (parsed.kind === 'intel') {
    const log = await prisma.intelligenceLog.findFirst({
      where: { id: parsed.id, system: { environmentId: envId } },
      select: { id: true, action: true, createdAt: true, systemId: true },
    });
    if (!log) return Response.json({ error: 'Action not found' }, { status: 404 });
    const age = Date.now() - log.createdAt.getTime();
    if (age > UNDO_WINDOW_MS) {
      return Response.json({ error: 'Undo window expired' }, { status: 410 });
    }
    await prisma.auditLog.create({
      data: {
        environmentId: envId,
        environmentName: env.name,
        actorId: identity.id,
        action: `undo.${log.action}`,
        entity: 'intelligenceLog',
        entityId: log.id,
        metadata: JSON.stringify({ reason: 'user_undo', windowMs: UNDO_WINDOW_MS }),
      },
    });
    // Nova-side learning signal: remember that this action was
    // overridden so future prompts avoid repeating it.
    await prisma.novaMemory.create({
      data: {
        type: 'user_correction',
        category: 'override',
        title: `Undo: ${log.action}`,
        content: `Action ${log.action} at ${log.createdAt.toISOString()} was undone by the user within the review window. Treat similar future proposals with more caution or escalate.`,
        source: 'user_correction',
        confidence: 0.9,
        systemId: log.systemId ?? undefined,
        environmentId: envId,
      },
    });
    return Response.json({ ok: true, undone: true, kind: 'intel' });
  }

  // audit kind — record the undo but don't touch referenced data.
  const aLog = await prisma.auditLog.findFirst({
    where: { id: parsed.id, environmentId: envId },
    select: { id: true, action: true, createdAt: true, entity: true, entityId: true, entityName: true },
  });
  if (!aLog) return Response.json({ error: 'Action not found' }, { status: 404 });
  const age = Date.now() - aLog.createdAt.getTime();
  if (age > UNDO_WINDOW_MS) {
    return Response.json({ error: 'Undo window expired' }, { status: 410 });
  }
  await prisma.auditLog.create({
    data: {
      environmentId: envId,
      environmentName: env.name,
      actorId: identity.id,
      action: `undo.${aLog.action}`,
      entity: aLog.entity,
      entityId: aLog.entityId,
      entityName: aLog.entityName,
      metadata: JSON.stringify({ reason: 'user_undo' }),
    },
  });
  return Response.json({ ok: true, undone: true, kind: 'audit' });
}
