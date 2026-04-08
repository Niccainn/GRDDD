import { prisma } from './db';
import type { AuthIdentity } from './auth';

export type EnvironmentAccess = {
  environmentId: string;
  role: 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER';
};

/**
 * Check if the identity has access to the given environment.
 * Returns the role if access is granted.
 * Throws 403 Response if denied, 404 if environment doesn't exist.
 */
export async function requireEnvironmentAccess(
  identity: AuthIdentity,
  environmentId: string
): Promise<EnvironmentAccess> {
  const env = await prisma.environment.findUnique({
    where: { id: environmentId },
    select: { id: true, ownerId: true, deletedAt: true },
  });

  if (!env || env.deletedAt) {
    throw new Response(JSON.stringify({ error: 'Environment not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Owner always has ADMIN access
  if (env.ownerId === identity.id) {
    return { environmentId, role: 'ADMIN' };
  }

  const membership = await prisma.environmentMembership.findUnique({
    where: { environmentId_identityId: { environmentId, identityId: identity.id } },
  });

  if (!membership) {
    throw new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return { environmentId, role: membership.role as EnvironmentAccess['role'] };
}

/**
 * Require at least CONTRIBUTOR role (rejects VIEWER).
 */
export async function requireWriteAccess(
  identity: AuthIdentity,
  environmentId: string
): Promise<EnvironmentAccess> {
  const access = await requireEnvironmentAccess(identity, environmentId);
  if (access.role === 'VIEWER') {
    throw new Response(JSON.stringify({ error: 'Write access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return access;
}

/**
 * Require ADMIN role.
 */
export async function requireAdminAccess(
  identity: AuthIdentity,
  environmentId: string
): Promise<EnvironmentAccess> {
  const access = await requireEnvironmentAccess(identity, environmentId);
  if (access.role !== 'ADMIN') {
    throw new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return access;
}

/**
 * Get all environment IDs the user has access to.
 */
export async function getUserEnvironmentIds(identity: AuthIdentity): Promise<string[]> {
  const [owned, memberships] = await Promise.all([
    prisma.environment.findMany({
      where: { ownerId: identity.id, deletedAt: null },
      select: { id: true },
    }),
    prisma.environmentMembership.findMany({
      where: { identityId: identity.id },
      select: { environmentId: true },
    }),
  ]);

  const ids = new Set([
    ...owned.map(e => e.id),
    ...memberships.map(m => m.environmentId),
  ]);
  return Array.from(ids);
}
