/**
 * Public-share tokens — stateless signed URLs for sharing a read-only
 * view of an Environment (or any other entity) without storing token
 * rows in the DB.
 *
 * Why stateless: shipping the share feature with zero migrations was
 * the constraint. HMAC(entity-id ‖ expires-at) over a server secret
 * is enough for short-lived read-only links. If the secret rotates,
 * every outstanding link invalidates — intentional.
 *
 * Security notes:
 *   - Links expire (default 30 days).
 *   - No write operations are ever gated by these tokens.
 *   - The endpoint that consumes them returns a whitelisted
 *     subset of fields; no secrets, no PII, no integration tokens.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string {
  // Prefer an explicit env var. Fall back to NEXTAUTH_SECRET so dev
  // works out of the box on a freshly cloned repo. If neither exists,
  // refuse — better than silently signing with a static string.
  const s = process.env.PUBLIC_SHARE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      'Public sharing is disabled: set PUBLIC_SHARE_SECRET (>=16 chars) in env.',
    );
  }
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function signShareToken(
  entityType: string,
  entityId: string,
  ttlMs: number = DEFAULT_TTL_MS,
): { token: string; expiresAt: string } {
  const exp = Date.now() + ttlMs;
  const payload = `${entityType}:${entityId}:${exp}`;
  const sig = sign(payload);
  const token = Buffer.from(`${exp}.${sig}`, 'utf8').toString('base64url');
  return { token, expiresAt: new Date(exp).toISOString() };
}

export function verifyShareToken(
  entityType: string,
  entityId: string,
  token: string,
): { ok: boolean; expiresAt?: string; reason?: string } {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const [expStr, sig] = raw.split('.', 2);
    const exp = parseInt(expStr, 10);
    if (!Number.isFinite(exp) || !sig) return { ok: false, reason: 'malformed' };
    if (Date.now() > exp) return { ok: false, reason: 'expired' };
    const expected = sign(`${entityType}:${entityId}:${exp}`);
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return { ok: false, reason: 'bad_signature' };
    if (!timingSafeEqual(a, b)) return { ok: false, reason: 'bad_signature' };
    return { ok: true, expiresAt: new Date(exp).toISOString() };
  } catch {
    return { ok: false, reason: 'malformed' };
  }
}

export function shareUrl(
  origin: string,
  entityType: 'environment',
  entityId: string,
  token: string,
): string {
  return `${origin.replace(/\/$/, '')}/share/${entityType}/${entityId}?t=${encodeURIComponent(token)}`;
}
