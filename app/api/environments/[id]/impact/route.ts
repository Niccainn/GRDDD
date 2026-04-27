/**
 * GET /api/environments/[id]/impact
 *
 * Returns a count summary of what gets affected when this env is
 * deleted. Used by the delete-confirm modal to show "X members will
 * lose access, Y integrations will disconnect" before the user
 * confirms — matches the Notion / Monday cross-impact alert pattern.
 *
 * Counts include both active and soft-deleted child rows (no
 * `deletedAt: null` filter on the children) because soft-deleting
 * the parent env makes everything underneath it invisible whether
 * it was already trashed or still active. The user's mental model
 * is "what's in this workspace", not "what's currently active".
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsEnvironmentIncludingTrashed } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  // Impact summary may need to load for an env that's already in
  // trash (e.g. if the user wants to see what they'd lose by hard-
  // purging). Allow trashed.
  await assertOwnsEnvironmentIncludingTrashed(id, identity.id);

  const [
    members,
    integrations,
    systems,
    workflows,
    tasks,
    goals,
    signals,
    documents,
  ] = await Promise.all([
    prisma.environmentMembership.count({ where: { environmentId: id } }),
    prisma.integration.count({ where: { environmentId: id } }),
    prisma.system.count({ where: { environmentId: id } }),
    prisma.workflow.count({ where: { environmentId: id } }),
    prisma.task.count({ where: { environmentId: id } }),
    prisma.goal.count({ where: { environmentId: id } }),
    prisma.signal.count({ where: { environmentId: id } }),
    prisma.document.count({ where: { environmentId: id } }),
  ]);

  return Response.json({
    members,
    integrations,
    systems,
    workflows,
    tasks,
    goals,
    signals,
    documents,
  });
}
