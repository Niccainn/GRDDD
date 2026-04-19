/**
 * Consent-log capture. Wraps the ConsentLog insert with two things
 * every caller would otherwise re-invent:
 *   - IP hashing (we never store raw IPs — GDPR data-min principle)
 *   - userAgent truncation (first 200 chars so our DB can't be used
 *     to fingerprint a specific browser/device combo in perpetuity)
 *
 * The POLICY_VERSION constant is the single source of truth for the
 * "which version of terms/privacy was in force when consent was given"
 * field. Bump it every time Privacy Policy or Terms change so renewal
 * prompts can be targeted accurately.
 */

import { createHash } from 'node:crypto';
import { prisma } from '../db';

// Bump when Terms of Service or Privacy Policy materially change.
// Stored on every new ConsentLog row so re-consent prompts can be
// triggered precisely: "last consented to 2026-04-19, current is
// 2026-06-01 → ask them to re-accept".
export const POLICY_VERSION = '2026-04-19';

export type ConsentKind =
  | 'signup_tos_privacy'   // User accepted ToS + Privacy at sign-up
  | 'marketing_email'      // User opted in to non-transactional email
  | 'analytics_cookies'    // User allowed non-essential cookies
  | 'data_processing'      // Enterprise DPA consent
  | 'third_party_share';   // If we ever share data with a partner

/** IP → short salted hash. Never reversible; only used for audit joins. */
function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.GRID_ENCRYPTION_KEY ?? 'dev-salt';
  return createHash('sha256').update(`${ip}:${salt}`).digest('hex').slice(0, 32);
}

function truncUa(ua: string | null | undefined): string | null {
  if (!ua) return null;
  return ua.slice(0, 200);
}

export async function recordConsent(params: {
  identityId: string | null;
  kind: ConsentKind;
  granted: boolean;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.consentLog.create({
      data: {
        identityId: params.identityId,
        kind: params.kind,
        granted: params.granted,
        policyVersion: POLICY_VERSION,
        ipHash: hashIp(params.ip ?? null),
        userAgent: truncUa(params.userAgent),
        metadata: params.metadata ? JSON.stringify(params.metadata).slice(0, 2000) : null,
      },
    });
  } catch (err) {
    // Consent logging must NEVER block user flow. If the table is
    // unreachable, log it via the error scope and let the sign-up
    // continue; we'll re-prompt on next session anyway.
    try {
      const { logError } = await import('../observability/errors');
      await logError({
        scope: 'consent_log',
        level: 'error',
        message: err instanceof Error ? err.message : 'unknown',
        identityId: params.identityId ?? undefined,
        context: { kind: params.kind, granted: params.granted },
      });
    } catch {
      /* give up silently */
    }
  }
}

/** Helper: fetch the latest ConsentLog entry per kind for one identity. */
export async function latestConsentByKind(identityId: string): Promise<Record<ConsentKind, { granted: boolean; at: Date } | null>> {
  const rows = await prisma.consentLog.findMany({
    where: { identityId },
    orderBy: { createdAt: 'desc' },
  });
  const out = {} as Record<ConsentKind, { granted: boolean; at: Date } | null>;
  for (const row of rows) {
    const kind = row.kind as ConsentKind;
    if (!out[kind]) {
      out[kind] = { granted: row.granted, at: row.createdAt };
    }
  }
  return out;
}
