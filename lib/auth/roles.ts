/**
 * Role helper — a small primitive route handlers can call to enforce
 * per-route role access against an Environment.
 *
 * Today most write routes still go through assertOwnsEnvironment(),
 * which is the correct check for owner-only mutations (rename,
 * delete, billing). For routes that should open up to ADMIN or
 * CONTRIBUTOR, use requireRole() instead.
 *
 *   await requireRole(envId, identity.id, 'CONTRIBUTOR');
 *
 * Throws an RoleAccessDenied error (caught by API routes and turned
 * into a 403) when the caller doesn't meet the minimum role.
 *
 * Role order (ascending privilege):
 *   VIEWER < CONTRIBUTOR < ADMIN < OWNER
 */

import { prisma } from '../db';

export type Role = 'VIEWER' | 'CONTRIBUTOR' | 'ADMIN' | 'OWNER';

const ORDER: Record<Role, number> = {
  VIEWER: 1,
  CONTRIBUTOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

export class RoleAccessDenied extends Error {
  status: 403 | 404;
  constructor(reason: 'not-found' | 'insufficient', public required: Role, public actual?: Role) {
    super(reason === 'not-found' ? 'Not found' : 'Insufficient role');
    this.status = reason === 'not-found' ? 404 : 403;
    this.name = 'RoleAccessDenied';
  }
}

/**
 * Resolve the caller's role on an Environment.
 * OWNER wins over any membership row. Returns null if the user has
 * no relationship to the environment.
 */
export async function roleOn(envId: string, identityId: string): Promise<Role | null> {
  const env = await prisma.environment.findFirst({
    where: { id: envId, deletedAt: null },
    select: {
      ownerId: true,
      memberships: {
        where: { identityId },
        select: { role: true },
      },
    },
  });
  if (!env) return null;
  if (env.ownerId === identityId) return 'OWNER';
  const membership = env.memberships[0];
  if (!membership) return null;
  const r = membership.role.toUpperCase() as Role;
  return r in ORDER ? r : null;
}

export async function requireRole(
  envId: string,
  identityId: string,
  minimum: Role,
): Promise<Role> {
  const actual = await roleOn(envId, identityId);
  if (actual == null) {
    throw new RoleAccessDenied('not-found', minimum);
  }
  if (ORDER[actual] < ORDER[minimum]) {
    throw new RoleAccessDenied('insufficient', minimum, actual);
  }
  return actual;
}

/**
 * Wrap a handler body so a thrown RoleAccessDenied is turned into a
 * proper Response. Keeps route files concise:
 *
 *   export const POST = withRoles(async (req, ctx) => {
 *     await requireRole(envId, identity.id, 'ADMIN');
 *     ...
 *   });
 */
export async function withRoles<T>(fn: () => Promise<T>): Promise<T | Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof RoleAccessDenied) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
