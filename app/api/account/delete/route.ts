import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { logError } from '@/lib/observability/errors';

/**
 * GDPR Article 17 — Right to Erasure.
 *
 *   POST /api/account/delete
 *
 * Irrevocably deletes the authenticated identity and every tenant-
 * scoped row they own or created. Cascades via Prisma's `onDelete: Cascade`
 * on Identity → Environment → every downstream table, supplemented
 * by explicit deletes for the handful of models where cascade isn't
 * wired (audit logs, analytics events, app errors).
 *
 * Confirmation: the client must send `{ "confirm": "DELETE <email>" }`
 * with the exact email on file. Prevents accidental clicks. The POST
 * method (not DELETE) is deliberate — browser prefetchers won't fire
 * POST requests.
 *
 * No soft-delete retention. Once this returns 200, the tenant's data
 * is unrecoverable. There is no "undelete" endpoint by design — that
 * would defeat the GDPR promise.
 *
 * Zero-cost posture: single DB transaction, no external API calls.
 */

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();

  // Tight rate limit: an account-delete request is a once-a-lifetime
  // event, so 3 attempts per hour is plenty. Prevents a compromised
  // session from accidentally being used to wipe multiple accounts.
  const rl = rateLimit(`account-delete:${identity.id}`, 3, 60 * 60_000);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => null);
  const confirm = body?.confirm;
  const expected = `DELETE ${identity.email ?? ''}`.trim();

  if (!confirm || typeof confirm !== 'string' || confirm.trim() !== expected) {
    return Response.json(
      {
        error: 'Confirmation required',
        hint: `Send {"confirm": "DELETE <your-email>"} to proceed.`,
      },
      { status: 400 },
    );
  }

  let deletedEnvironments = 0;
  let deletedSessions = 0;

  try {
    await prisma.$transaction(async tx => {
      // Environments the user owns → cascade kills Systems, Workflows,
      // Executions, Signals, Widgets, MasteryInsights, Integrations, etc.
      const envs = await tx.environment.findMany({
        where: { ownerId: identity.id },
        select: { id: true },
      });
      deletedEnvironments = envs.length;

      // AppError rows keyed to this identity or any of their envs.
      const envIds = envs.map(e => e.id);
      if (envIds.length > 0) {
        await tx.appError.deleteMany({
          where: { OR: [{ identityId: identity.id }, { environmentId: { in: envIds } }] },
        });
      } else {
        await tx.appError.deleteMany({ where: { identityId: identity.id } });
      }

      // Active sessions for this identity.
      const sessionsResult = await tx.session.deleteMany({ where: { identityId: identity.id } });
      deletedSessions = sessionsResult.count;

      // Finally, the Identity row itself. Cascades to owned environments
      // (everything under them), API keys, memberships, any
      // identity-scoped row with onDelete: Cascade.
      await tx.identity.delete({ where: { id: identity.id } });
    });
  } catch (err) {
    await logError({
      scope: 'account_delete',
      identityId: identity.id,
      message: err instanceof Error ? err.message : 'unknown error',
      context: { name: err instanceof Error ? err.name : 'unknown' },
    });
    return Response.json(
      { error: 'Deletion failed — please contact support if this persists.' },
      { status: 500 },
    );
  }

  // Clear the session cookie so the response doesn't leave a live
  // session pointing at a deleted identity.
  const res = Response.json({
    deleted: true,
    environmentsDeleted: deletedEnvironments,
    sessionsCleared: deletedSessions,
  });
  res.headers.set(
    'Set-Cookie',
    'grid_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure',
  );
  return res;
}
