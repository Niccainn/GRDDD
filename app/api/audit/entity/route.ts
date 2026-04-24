/**
 * GET /api/audit/entity?type=...&id=...[&limit=]
 *
 * Per-object activity feed. Reads AuditLog filtered by (entity,
 * entityId) with an access check that walks up the parent
 * environment. Returns a tight, render-ready shape — no nested
 * JSON the UI has to re-parse.
 *
 * The drawer UI (components/ActivitySheet.tsx) is the only caller
 * today. The endpoint is intentionally public-shaped so a future
 * Activity tab on any object page can reuse it.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const entity = req.nextUrl.searchParams.get('type');
  const entityId = req.nextUrl.searchParams.get('id');
  const limitRaw = parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200);

  if (!entity || !entityId) {
    return Response.json({ error: 'type and id required' }, { status: 400 });
  }

  // Pull every AuditLog row for this (entity, id). Filter by the
  // caller's accessible environments. AuditLog is append-only so
  // ordering is straightforward.
  const visibleEnvs = await prisma.environment.findMany({
    where: {
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
    select: { id: true },
  });
  const envIds = visibleEnvs.map(e => e.id);
  if (envIds.length === 0) return Response.json({ rows: [] });

  const rows = await prisma.auditLog.findMany({
    where: {
      entity,
      entityId,
      environmentId: { in: envIds },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      action: true,
      actorId: true,
      actorName: true,
      actorType: true,
      entity: true,
      entityId: true,
      entityName: true,
      before: true,
      after: true,
      metadata: true,
    },
  });

  return Response.json({
    rows: rows.map(r => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      action: r.action,
      actor: {
        id: r.actorId,
        name: r.actorName,
        type: r.actorType,
      },
      entity: { type: r.entity, id: r.entityId, name: r.entityName },
      hasBefore: !!r.before,
      hasAfter: !!r.after,
      hasMetadata: !!r.metadata,
      before: r.before,
      after: r.after,
      metadata: r.metadata,
    })),
  });
}
