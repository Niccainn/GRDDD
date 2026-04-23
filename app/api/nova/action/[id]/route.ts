/**
 * GET /api/nova/action/[id]
 *
 * Read-only "why did Nova do this?" drawer data for a single action.
 * Accepts either an intelligence-log id (prefixed "intel:") or an
 * audit-log id (prefixed "audit:"). Returns a shape suitable for
 * rendering the trace: action, inputs, reasoning, outputs, and any
 * tool calls with their arguments.
 *
 * This is the surface the trust layer rests on. It does not mutate
 * anything and redacts nothing that isn't already redacted upstream.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id: rawId } = await params;
  const [kind, id] = rawId.includes(':') ? rawId.split(':', 2) : ['intel', rawId];

  if (kind === 'intel') {
    const log = await prisma.intelligenceLog.findFirst({
      where: {
        id,
        system: {
          environment: {
            deletedAt: null,
            OR: [
              { ownerId: identity.id },
              { memberships: { some: { identityId: identity.id } } },
            ],
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
        action: true,
        input: true,
        output: true,
        reasoning: true,
        tokens: true,
        cost: true,
        success: true,
        error: true,
        system: { select: { id: true, name: true, color: true } },
      },
    });
    if (!log) return Response.json({ error: 'Not found' }, { status: 404 });

    return Response.json({
      id: `intel:${log.id}`,
      source: 'nova',
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      system: log.system,
      input: log.input,
      output: log.output,
      reasoning: log.reasoning ??
        'No explicit trace was recorded for this action. Nova acted on the latest instructions from this system\'s memory and context.',
      tokens: log.tokens,
      cost: log.cost,
      success: log.success,
      error: log.error,
    });
  }

  if (kind === 'audit') {
    const log = await prisma.auditLog.findFirst({
      where: { id },
      select: {
        id: true,
        createdAt: true,
        action: true,
        entity: true,
        entityId: true,
        entityName: true,
        actorId: true,
        actorName: true,
        actorType: true,
        before: true,
        after: true,
        metadata: true,
        environmentId: true,
      },
    });
    if (!log || !log.environmentId) return Response.json({ error: 'Not found' }, { status: 404 });

    // AuditLog has no environment relation — verify access via a second query.
    const env = await prisma.environment.findFirst({
      where: {
        id: log.environmentId,
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id } } },
        ],
      },
      select: { id: true },
    });
    if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

    return Response.json({
      id: `audit:${log.id}`,
      source: 'audit',
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      entity: { type: log.entity, id: log.entityId, name: log.entityName },
      actor: { id: log.actorId, name: log.actorName, type: log.actorType },
      before: log.before,
      after: log.after,
      metadata: log.metadata,
    });
  }

  return Response.json({ error: 'Unknown action kind' }, { status: 400 });
}
