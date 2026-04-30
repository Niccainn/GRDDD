/**
 * POST /api/memory/from-override
 *
 * Closes the LMS-replacement loop (pillar 5 of the cognition-platform
 * framing): when a user corrects Nova on /audit — "this routing was
 * wrong", "don't do this again", "next time, X" — that override
 * becomes a NovaMemory of type `user_correction`. The next Nova call
 * for the same scope reads the correction as context.
 *
 * Without this wire, /audit is a passive log and overrides never
 * teach. With it, the audit page IS the curriculum.
 *
 * Body:
 *   { auditLogId: string, lesson: string, environmentId?: string,
 *     systemId?: string }
 *
 * Auth: caller must own the parent environment of the audit row,
 * OR be the actor on the row. Same posture as the /audit GET.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const auditLogId = typeof body.auditLogId === 'string' ? body.auditLogId : null;
  const lesson = typeof body.lesson === 'string' ? body.lesson.trim() : '';
  if (!auditLogId || !lesson) {
    return Response.json({ error: 'auditLogId and lesson are required' }, { status: 400 });
  }
  if (lesson.length > 2000) {
    return Response.json({ error: 'Lesson too long (max 2000 chars)' }, { status: 400 });
  }

  // Verify the caller can see the audit row. Match the /api/audit
  // tenant scope: actor match or owned environment.
  const log = await prisma.auditLog.findUnique({ where: { id: auditLogId } });
  if (!log) return Response.json({ error: 'Audit row not found' }, { status: 404 });

  const ownedEnv = log.environmentId
    ? await prisma.environment.findFirst({
        where: { id: log.environmentId, ownerId: identity.id, deletedAt: null },
      })
    : null;
  const actorMatches = log.actorId === identity.id;
  if (!ownedEnv && !actorMatches) {
    return Response.json({ error: 'Audit row not found' }, { status: 404 });
  }

  // The lesson title is short prose extracted from the override —
  // first 80 chars without trailing punctuation. The full lesson
  // lives in `content`; the title gives the memory list a scannable
  // label.
  const title = lesson.slice(0, 80).replace(/[.!?]+$/, '');

  // Category mirrors the audit action's first segment ("workflow",
  // "execution", "nova"). Lets future Nova calls filter to the
  // relevant correction-class without scanning every memory.
  const category = log.action.split('.')[0] ?? null;

  const memory = await prisma.novaMemory.create({
    data: {
      type: 'user_correction',
      category,
      title,
      content: lesson,
      source: 'correction',
      confidence: 1.0, // explicit user input — top confidence
      environmentId: log.environmentId ?? null,
      // systemId not on AuditLog; keep null. Could be passed in body
      // later if reviewers want to scope a correction to a System.
    },
    select: { id: true, title: true, environmentId: true },
  });

  // Mirror the override into AuditLog itself so the next /audit
  // render shows "you corrected this" without reading NovaMemory.
  await prisma.auditLog.create({
    data: {
      action: 'nova.memory_updated',
      entity: 'NovaMemory',
      entityId: memory.id,
      entityName: memory.title,
      actorId: identity.id,
      actorName: identity.name ?? identity.email ?? 'user',
      actorType: 'user',
      environmentId: memory.environmentId,
      metadata: JSON.stringify({ sourceAuditLogId: auditLogId, lesson }),
    },
  }).catch(() => {/* non-fatal — the memory itself is the contract */});

  return Response.json({ id: memory.id, title: memory.title });
}
