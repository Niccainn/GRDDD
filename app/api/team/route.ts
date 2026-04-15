import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { hashEmail } from '@/lib/crypto/email-hash';

/**
 * Helper: returns the IDs of environments the caller owns or is an
 * ADMIN member of. These are the environments the caller can manage
 * team members for.
 */
async function getAdminEnvironmentIds(identityId: string): Promise<string[]> {
  const envs = await prisma.environment.findMany({
    where: {
      deletedAt: null,
      OR: [
        { ownerId: identityId },
        { memberships: { some: { identityId, role: 'ADMIN' } } },
      ],
    },
    select: { id: true },
  });
  return envs.map(e => e.id);
}

/**
 * GET /api/team
 *
 * Returns team members visible to the caller: people who share at
 * least one environment the caller owns or administers.
 */
export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const adminEnvIds = await getAdminEnvironmentIds(identity.id);
  if (adminEnvIds.length === 0) {
    return Response.json([]);
  }

  // Return identities who have a membership in any of the caller's
  // admin environments (plus the caller themselves).
  const members = await prisma.identity.findMany({
    where: {
      OR: [
        { id: identity.id },
        { environmentMemberships: { some: { environmentId: { in: adminEnvIds } } } },
        { ownedEnvironments: { some: { id: { in: adminEnvIds } } } },
      ],
    },
    include: {
      environmentMemberships: {
        where: { environmentId: { in: adminEnvIds } },
        include: { environment: { select: { id: true, name: true, color: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return Response.json(members.map(m => ({
    id: m.id,
    name: m.name,
    email: m.email,
    type: m.type,
    avatar: m.avatar,
    createdAt: m.createdAt.toISOString(),
    memberships: m.environmentMemberships.map(em => ({
      role: em.role,
      environmentId: em.environmentId,
      environmentName: em.environment.name,
      environmentColor: em.environment.color,
    })),
  })));
}

/**
 * POST /api/team
 *
 * Invite a new team member. Caller must own or be ADMIN of the target
 * environment. If no environmentId is provided, the member is created
 * without any membership (just an Identity row).
 */
export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { name, email, type, environmentId, role } = await req.json();
  if (!name || !email) return Response.json({ error: 'Name and email required' }, { status: 400 });

  // If an environmentId is provided, verify the caller is owner or ADMIN.
  if (environmentId) {
    const env = await prisma.environment.findFirst({
      where: {
        id: environmentId,
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id, role: 'ADMIN' } } },
        ],
      },
      select: { id: true },
    });
    if (!env) {
      return Response.json({ error: 'Not authorized to invite to this environment' }, { status: 403 });
    }
  }

  const existing = await prisma.identity.findFirst({ where: { emailHash: hashEmail(email) } });
  if (existing) return Response.json({ error: 'Email already exists' }, { status: 409 });

  const newMember = await prisma.identity.create({
    data: { name, email, type: type ?? 'PERSON' },
  });

  if (environmentId && role) {
    await prisma.environmentMembership.create({
      data: { environmentId, identityId: newMember.id, role },
    });
  }

  return Response.json({ id: newMember.id, name: newMember.name, email: newMember.email });
}

/**
 * DELETE /api/team?id=xxx
 *
 * Remove a team member. The caller can only remove members from
 * environments they own or administer. This removes the memberships
 * (not the Identity row itself, which could belong to other envs).
 */
export async function DELETE(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  if (id === identity.id) {
    return Response.json({ error: 'Cannot remove yourself' }, { status: 403 });
  }

  // Only remove memberships from environments the caller administers.
  const adminEnvIds = await getAdminEnvironmentIds(identity.id);
  if (adminEnvIds.length === 0) {
    return Response.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Verify the target has at least one membership in those environments.
  const targetMemberships = await prisma.environmentMembership.findMany({
    where: {
      identityId: id,
      environmentId: { in: adminEnvIds },
    },
  });

  if (targetMemberships.length === 0) {
    return Response.json({ error: 'Member not found' }, { status: 404 });
  }

  // Remove the memberships the caller has authority over.
  await prisma.environmentMembership.deleteMany({
    where: {
      identityId: id,
      environmentId: { in: adminEnvIds },
    },
  });

  return Response.json({ deleted: true, removedMemberships: targetMemberships.length });
}
