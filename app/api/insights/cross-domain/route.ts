import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { assertOwnsEnvironment } from '@/lib/auth/ownership';

/**
 * Cross-domain insights API.
 *
 * Tenant-scoped: callers only see insights for environments they own
 * OR insights with no environmentId (legacy/demo seed data).
 *
 * Writes (POST/PATCH) require a specific environmentId the caller owns.
 * This closes the cross-tenant read + update gap flagged in the
 * pre-beta security audit (see docs/TESTS.md).
 */

async function getOwnedEnvIds(identityId: string): Promise<string[]> {
  const envs = await prisma.environment.findMany({
    where: { ownerId: identityId, deletedAt: null },
    select: { id: true },
  });
  return envs.map(e => e.id);
}

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') ?? undefined;
  const severity = searchParams.get('severity') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  const envIds = await getOwnedEnvIds(identity.id);

  // Tenant scope: only the caller's owned environments. Previously
  // we also surfaced rows with `environmentId: null` as "legacy/demo
  // seed data" — but those leaked the same mockup insights to every
  // account, breaking the per-user "one truth" model the dashboard
  // depends on. Demo rows belong in onboarding, not in every signed-
  // in user's intelligence panel.
  if (envIds.length === 0) return Response.json([]);

  const insights = await prisma.crossDomainInsight.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(severity ? { severity } : {}),
      environmentId: { in: envIds },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number.isFinite(limit) && limit > 0 ? limit : 50, 100),
  });

  return Response.json(insights);
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { title, description, category, severity, confidence, sourceDomains, targetDomains, evidence, dataPoints, environmentId } = body;

  if (!title || !description || !category || !sourceDomains || !targetDomains) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Require a scoped environment on create. Previously unscoped writes
  // could pollute a global feed visible to every tenant.
  if (!environmentId || typeof environmentId !== 'string') {
    return Response.json({ error: 'environmentId is required' }, { status: 400 });
  }
  await assertOwnsEnvironment(environmentId, identity.id);

  const insight = await prisma.crossDomainInsight.create({
    data: {
      environmentId,
      title,
      description,
      category,
      severity: severity ?? 'info',
      confidence: confidence ?? 0.6,
      sourceDomains: typeof sourceDomains === 'string' ? sourceDomains : JSON.stringify(sourceDomains),
      targetDomains: typeof targetDomains === 'string' ? targetDomains : JSON.stringify(targetDomains),
      evidence: evidence ? (typeof evidence === 'string' ? evidence : JSON.stringify(evidence)) : null,
      dataPoints: dataPoints ?? 0,
    },
  });

  return Response.json(insight, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const { id, acknowledged, actionTaken } = body;

  if (!id) {
    return Response.json({ error: 'Missing insight id' }, { status: 400 });
  }

  const existing = await prisma.crossDomainInsight.findUnique({ where: { id } });
  if (!existing) {
    // 404 on not-found AND on no-access — never 403 (existence leak).
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Tenant check. Null environmentId = demo seed data — read-only for
  // everyone, so reject the PATCH rather than let a user mark shared
  // demo rows as acknowledged.
  if (existing.environmentId === null) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  await assertOwnsEnvironment(existing.environmentId, identity.id);

  const data: { acknowledged?: boolean; actionTaken?: string; resolvedAt?: Date } = {};
  if (typeof acknowledged === 'boolean') data.acknowledged = acknowledged;
  if (typeof actionTaken === 'string') {
    data.actionTaken = actionTaken;
    data.resolvedAt = new Date();
  }

  const updated = await prisma.crossDomainInsight.update({
    where: { id },
    data,
  });

  return Response.json(updated);
}
