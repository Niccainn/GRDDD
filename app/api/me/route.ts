/**
 * DELETE /api/me
 *
 * GDPR Article 17 — Right to Erasure.
 *
 * Double-gated:
 *   1. User must be authenticated
 *   2. Body must contain the exact confirmation string. This is a
 *      deliberate friction — a stray DELETE (fuzzer, bored admin,
 *      copy-pasted curl) should not nuke a user's entire workspace.
 *
 * On success the server also expires the session cookie in the
 * response, so the caller's open tab is immediately logged out.
 */
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthIdentity } from '@/lib/auth';
import { eraseUserData } from '@/lib/gdpr';
import { captureMessage } from '@/lib/monitoring';

const REQUIRED_CONFIRMATION = 'DELETE MY DATA';

export async function DELETE(req: NextRequest) {
  const identity = await getAuthIdentity();

  let body: { confirmation?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body — fall through to the confirmation check below
  }

  if (body.confirmation !== REQUIRED_CONFIRMATION) {
    return Response.json(
      {
        error: 'Confirmation required',
        hint: `Send { "confirmation": "${REQUIRED_CONFIRMATION}" } in the request body to proceed. This action cannot be undone.`,
      },
      { status: 400 }
    );
  }

  await eraseUserData(identity.id);

  // Log the erasure for the audit trail before the session cookie is
  // cleared. This is a non-reversible operation — we want a breadcrumb
  // in Sentry / the function log no matter what.
  await captureMessage('gdpr.erasure_completed', 'info', {
    surface: 'api/me',
    tenantId: identity.id,
    extras: { erasedAt: new Date().toISOString() },
  });

  // Kill the session cookie in the outgoing response. The erasure
  // transaction already deleted the server-side session row, so even
  // if this cookie-clear raced against a replay, the server would
  // reject the token.
  const cookieStore = await cookies();
  cookieStore.delete('grid_session');

  return Response.json({
    success: true,
    message: 'Your data has been erased. This action is irreversible.',
  });
}
