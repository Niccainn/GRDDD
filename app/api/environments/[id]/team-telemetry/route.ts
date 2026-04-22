/**
 * GET /api/environments/[id]/team-telemetry
 *
 * Per-member adoption telemetry. For each member (owner + memberships):
 *   - approvalsApproved / approvalsTotal → approval rate
 *   - overrides (rejected + changes_requested) → override rate
 *   - executionReviews count → engagement depth
 *   - trustScore ≈ 100 - overrideRate * 100
 *
 * Owner-only read: this is CHRO-adjacent data and we default to the
 * strictest access scope.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { decryptPII } from '@/lib/crypto/pii-encryption';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id: envId } = await params;
  const env = await prisma.environment.findFirst({
    where: { id: envId, ownerId: identity.id, deletedAt: null },
    select: { id: true, ownerId: true, owner: { select: { id: true, name: true } } },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const daysRaw = parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10);
  const days = Math.min(Math.max(Number.isFinite(daysRaw) ? daysRaw : 30, 7), 365);
  const since = new Date(Date.now() - days * MS_PER_DAY);

  const memberships = await prisma.environmentMembership.findMany({
    where: { environmentId: envId },
    select: {
      id: true,
      role: true,
      identity: { select: { id: true, name: true } },
    },
  });

  const memberIds = [env.ownerId, ...memberships.map(m => m.identity.id)];
  const unique = Array.from(new Set(memberIds));

  // Batch counts per identity.
  const rows = await Promise.all(
    unique.map(async id => {
      const [approvalsTotal, approvalsApproved, overrides, reviews] = await Promise.all([
        prisma.approvalRequest.count({
          where: { requesterId: id, createdAt: { gte: since }, environmentId: envId },
        }),
        prisma.approvalRequest.count({
          where: {
            requesterId: id,
            createdAt: { gte: since },
            environmentId: envId,
            status: 'approved',
          },
        }),
        prisma.approvalRequest.count({
          where: {
            requesterId: id,
            createdAt: { gte: since },
            environmentId: envId,
            status: { in: ['rejected', 'changes_requested'] },
          },
        }),
        prisma.executionReview.count({
          where: { reviewerId: id, createdAt: { gte: since }, environmentId: envId },
        }),
      ]);

      const overrideRate =
        approvalsTotal > 0 ? Math.round((overrides / approvalsTotal) * 100) : 0;
      const approvalRate =
        approvalsTotal > 0 ? Math.round((approvalsApproved / approvalsTotal) * 100) : 0;
      const trustScore = Math.max(0, 100 - overrideRate);

      return {
        identityId: id,
        approvalsTotal,
        approvalsApproved,
        overrides,
        reviews,
        overrideRate,
        approvalRate,
        trustScore,
      };
    }),
  );

  // Resolve names. Owner + membership identity already have names;
  // decrypt if wrapped.
  const nameLookup = new Map<string, { name: string; role: string }>();
  nameLookup.set(env.ownerId, { name: decryptPII(env.owner?.name ?? 'Owner'), role: 'OWNER' });
  for (const m of memberships) {
    nameLookup.set(m.identity.id, {
      name: decryptPII(m.identity.name ?? 'Unknown'),
      role: m.role,
    });
  }

  const members = rows.map(r => {
    const info = nameLookup.get(r.identityId) ?? { name: 'Unknown', role: 'MEMBER' };
    return { ...r, name: info.name, role: info.role };
  });

  // Aggregate cohort stats so the widget can show both the per-row
  // and the "team average" line.
  const cohort = {
    memberCount: members.length,
    avgTrust:
      members.length > 0
        ? Math.round(members.reduce((s, m) => s + m.trustScore, 0) / members.length)
        : 100,
    avgOverrideRate:
      members.length > 0
        ? Math.round(members.reduce((s, m) => s + m.overrideRate, 0) / members.length)
        : 0,
    totalApprovals: members.reduce((s, m) => s + m.approvalsTotal, 0),
    totalReviews: members.reduce((s, m) => s + m.reviews, 0),
  };

  return Response.json({ windowDays: days, cohort, members });
}
