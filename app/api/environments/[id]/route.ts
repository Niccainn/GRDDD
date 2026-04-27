import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsEnvironment, assertOwnsEnvironmentIncludingTrashed } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsEnvironment(id, identity.id);
  const body = await req.json();
  const updated = await prisma.environment.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
    },
  });
  return Response.json(updated);
}

/**
 * DELETE /api/environments/[id]
 *
 * Soft-delete by default. Sets `deletedAt = now()` so the env
 * disappears from active lists but is recoverable from /environments/trash.
 * Matches the Notion / Monday "send to trash" pattern.
 *
 * Hard-delete requires `?purge=1` and only works on already-trashed
 * envs — protects against a stale client accidentally bypassing the
 * recoverable soft-delete.
 *
 * Cascade behavior is already correct: child models filter on parent
 * deletedAt in their queries, so a soft-deleted env hides its systems,
 * workflows, tasks, etc. automatically without touching their rows.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  // Allow trashed envs in this code path so the owner can purge
  // them or send-to-trash idempotently. Active env access goes
  // through assertOwnsEnvironment elsewhere.
  const current = await assertOwnsEnvironmentIncludingTrashed(id, identity.id);

  const purge = new URL(req.url).searchParams.get('purge') === '1';

  if (purge) {
    if (!current.deletedAt) {
      return Response.json(
        { error: 'Send to trash first; hard-delete only works on already-trashed environments.' },
        { status: 409 },
      );
    }
    await prisma.environment.delete({ where: { id } });
    return Response.json({ deleted: true, purged: true });
  }

  // Soft-delete. Idempotent — re-deleting a trashed env refreshes
  // the timestamp (resets the 30-day clock for /environments/trash).
  await prisma.environment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return Response.json({ deleted: true, trashed: true });
}
