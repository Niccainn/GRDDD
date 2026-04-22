/**
 * GET /api/environments/[id]/actions
 *
 * Action ledger feed for the Environment page: the last N things Nova
 * did inside this Environment. Unifies two sources:
 *
 *   - IntelligenceLog (Nova tool calls, queries, draft generations)
 *     joined via system.environmentId
 *   - AuditLog (higher-level mutations: workflow.created, approval.made,
 *     execution.failed, etc.) joined via environmentId directly
 *
 * Each row carries { id, source, action, summary, actor, createdAt,
 * systemId?, systemName?, systemColor?, reversible } so the same
 * component can render either.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id: envId } = await params;

  const env = await prisma.environment.findFirst({
    where: {
      id: envId,
      deletedAt: null,
      OR: [{ ownerId: identity.id }, { memberships: { some: { identityId: identity.id } } }],
    },
    select: { id: true },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const limitRaw = parseInt(req.nextUrl.searchParams.get('limit') ?? `${DEFAULT_LIMIT}`, 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : DEFAULT_LIMIT, 1), MAX_LIMIT);

  // Intelligence logs scoped to this environment via system join.
  const intelLogs = await prisma.intelligenceLog.findMany({
    where: { system: { environmentId: envId } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      action: true,
      input: true,
      reasoning: true,
      success: true,
      systemId: true,
      system: { select: { name: true, color: true } },
    },
  });

  // Audit entries for the same environment. Filter to high-signal
  // actions — we don't want to drown the ledger in trivia.
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      environmentId: envId,
      action: {
        in: [
          'workflow.created',
          'workflow.updated',
          'execution.completed',
          'execution.failed',
          'approval.approved',
          'approval.rejected',
          'member.added',
          'member.removed',
          'integration.connected',
          'integration.disconnected',
          'nova.query',
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      action: true,
      actorName: true,
      entity: true,
      entityName: true,
    },
  });

  type Row = {
    id: string;
    source: 'nova' | 'audit';
    action: string;
    summary: string;
    actor: string | null;
    createdAt: string;
    systemId: string | null;
    systemName: string | null;
    systemColor: string | null;
    reversible: boolean;
  };

  const rows: Row[] = [];

  for (const l of intelLogs) {
    const firstLine = (l.input ?? '').split('\n')[0].slice(0, 140);
    rows.push({
      id: `intel:${l.id}`,
      source: 'nova',
      action: l.action,
      summary: firstLine || 'Nova action',
      actor: 'Nova',
      createdAt: l.createdAt.toISOString(),
      systemId: l.systemId,
      systemName: l.system?.name ?? null,
      systemColor: l.system?.color ?? null,
      // Reversibility is a capability flag the UI shows; only certain
      // action types are safely undoable. Default false to be honest.
      reversible: l.action === 'draft.created' || l.action === 'task.created',
    });
  }

  for (const a of auditLogs) {
    rows.push({
      id: `audit:${a.id}`,
      source: 'audit',
      action: a.action,
      summary: a.entityName ? `${a.action.replace('.', ' · ')} · ${a.entityName}` : a.action,
      actor: a.actorName ?? 'system',
      createdAt: a.createdAt.toISOString(),
      systemId: null,
      systemName: null,
      systemColor: null,
      reversible: false,
    });
  }

  rows.sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
  return Response.json({ rows: rows.slice(0, limit) });
}
