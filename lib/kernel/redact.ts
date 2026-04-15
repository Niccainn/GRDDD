/**
 * Trace redaction — scrub high-confidence PII and secrets from
 * persisted kernel traces.
 *
 * Design rules:
 *   1. Redact only on the way OUT to the database. Live trace events
 *      sent to a user's OWN observability UI are untouched because the
 *      user already has access to the data they typed.
 *   2. Use conservative, precision-first regexes. False positives (a
 *      redacted string where nothing sensitive existed) cost us very
 *      little. False negatives (a CC number slipping through) cost us
 *      a breach notification and fines. Bias toward more redaction.
 *   3. Keep categories stable so we can audit coverage: emails, phone
 *      numbers, credit cards, US SSNs, IBANs, API-key-shaped tokens,
 *      and bearer tokens in Authorization headers.
 *   4. Walk the entire TraceRecord — events carry free text in many
 *      fields. Recursive walk with a type-preserving replacer avoids
 *      missing a new field added later.
 *
 * This is NOT a substitute for real secret scanning or DLP. It is a
 * best-effort hygiene pass so the promise we make in the privacy
 * policy ("we scrub PII from prompts and outputs") is backed by code.
 */

import type { TraceRecord } from './trace';

// ─── Pattern library ────────────────────────────────────────────────────────
//
// Every entry is [label, pattern]. Order matters: more specific patterns
// (API keys, bearer tokens) run first so a bearer-wrapped secret is
// redacted as a secret, not as "someone's email" inside the header.

const PATTERNS: Array<[string, RegExp]> = [
  // Authorization header with a bearer or basic token.
  ['[REDACTED_AUTH]', /\b(authorization|auth):\s*(bearer|basic)\s+[A-Za-z0-9._\-+/=]+/gi],

  // Anthropic / OpenAI / GitHub / Stripe / generic API keys.
  ['[REDACTED_KEY]', /\bsk-ant-[A-Za-z0-9_\-]{20,}/g],
  ['[REDACTED_KEY]', /\bsk-[A-Za-z0-9]{20,}/g],
  ['[REDACTED_KEY]', /\bgh[pousr]_[A-Za-z0-9]{20,}/g],
  ['[REDACTED_KEY]', /\b(rk|pk)_live_[A-Za-z0-9]{20,}/g],
  ['[REDACTED_KEY]', /\bAKIA[0-9A-Z]{16}\b/g], // AWS access key id
  ['[REDACTED_KEY]', /\b[A-Za-z0-9+/]{40}\b(?=\s|$)/g], // base64-ish 40-char tokens (heuristic)

  // Credit-card-like 13–19 digit runs with optional spaces/dashes.
  ['[REDACTED_CC]', /\b(?:\d[ -]?){13,19}\b/g],

  // US Social Security Number.
  ['[REDACTED_SSN]', /\b\d{3}-\d{2}-\d{4}\b/g],

  // IBAN (simplified: country letters + 2 check digits + 11+ chars).
  ['[REDACTED_IBAN]', /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g],

  // E.164 or common phone patterns. Intentionally narrow.
  ['[REDACTED_PHONE]', /\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g],

  // Email. Last so we don't eat the local-part of a bearer token.
  ['[REDACTED_EMAIL]', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],
];

/**
 * Redact a single string. Returns the cleaned string. Safe on empty
 * or non-string inputs (passthrough).
 */
export function redactString(input: string): string {
  if (!input || typeof input !== 'string') return input;
  let out = input;
  for (const [label, pattern] of PATTERNS) {
    out = out.replace(pattern, label);
  }
  return out;
}

/**
 * Recursively walk a value and redact every string field in place
 * by returning a new, redacted clone. Arrays and plain objects are
 * traversed; all other values are returned as-is.
 */
export function redactDeep<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === 'string') return redactString(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v)) as unknown as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactDeep(v);
    }
    return out as unknown as T;
  }
  return value;
}

/**
 * Redact a full TraceRecord in preparation for persistence.
 * Never mutates the input — returns a fresh object.
 */
export function redactTraceRecord(record: TraceRecord): TraceRecord {
  return redactDeep(record);
}
