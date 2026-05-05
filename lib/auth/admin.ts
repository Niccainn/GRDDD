/**
 * Admin gate.
 *
 * Until we ship a proper Role table on Identity, "admin" is defined
 * by membership in a small env-var-driven allowlist of email
 * addresses. This is the right shape for closed-beta — there are
 * three admins, the list rarely changes, and we don't need a UI to
 * manage roles. When we open up the platform we'll move to
 * Identity.role + a per-team admin scope.
 *
 * Set GRID_ADMIN_EMAILS to a comma-separated list:
 *   GRID_ADMIN_EMAILS=contact@grddd.com,nicole@grddd.com
 *
 * The check is case-insensitive and trims whitespace; emails are
 * normalised to lowercase on both sides.
 */

import { getAuthIdentity, getAuthIdentityOrNull } from '@/lib/auth';

function adminEmails(): Set<string> {
  const raw = (process.env.GRID_ADMIN_EMAILS ?? '').trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0 && e.includes('@')),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.trim().toLowerCase());
}

/**
 * Resolve the admin identity for the current request, or null if the
 * caller isn't authenticated or isn't on the allowlist.
 */
export async function getAdminIdentityOrNull() {
  const identity = await getAuthIdentityOrNull();
  if (!identity) return null;
  if (!isAdminEmail(identity.email)) return null;
  return identity;
}

/**
 * Require admin. Throws a Response (404 — same posture as the
 * tenant-isolation helpers; never 403, no existence side-channel) if
 * the caller isn't admin.
 */
export async function requireAdmin() {
  const identity = await getAuthIdentity();
  if (!isAdminEmail(identity.email)) {
    throw new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return identity;
}
