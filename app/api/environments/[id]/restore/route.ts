/**
 * POST /api/environments/[id]/restore
 *
 * Clears `deletedAt`, returning a soft-deleted env to the active
 * list. Counterpart to DELETE which sets it. Owner-only.
 *
 * Idempotent — restoring an already-active env is a no-op.
 *
 * Children (systems, workflows, tasks, etc.) become visible again
 * automatically because they filter on the env's deletedAt in their
 * own queries; their rows were never touched.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsEnvironmentIncludingTrashed } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  await assertOwnsEnvironmentIncludingTrashed(id, identity.id);

  const restored = await prisma.environment.update({
    where: { id },
    data: { deletedAt: null },
  });

  return Response.json({ id: restored.id, slug: restored.slug, name: restored.name });
}
