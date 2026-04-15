/**
 * Deterministic HMAC-SHA256 hash for email lookups.
 *
 * Because PII encryption uses a random nonce (AES-256-GCM), the same
 * email encrypts to a different ciphertext every time. That breaks
 * Prisma's `@unique` constraint and `findUnique({ where: { email } })`
 * lookups. This module provides a deterministic hash so we can store
 * `emailHash` alongside the encrypted email for indexed lookups.
 *
 * The hash is NOT reversible — it exists only for equality checks
 * ("does this email already exist?"). The actual email value is
 * recovered by decrypting the `email` column.
 *
 * Uses the same GRID_ENCRYPTION_KEY as pii-encryption.ts, derived
 * through HKDF to produce a distinct sub-key so a compromise of the
 * HMAC output doesn't weaken the encryption key.
 */

import crypto from 'node:crypto';

const KEY_BYTES = 32;

let cachedHmacKey: Buffer | null = null;

function getHmacKey(): Buffer {
  if (cachedHmacKey) return cachedHmacKey;
  const raw = process.env.GRID_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'GRID_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32',
    );
  }
  const masterKey = Buffer.from(raw, 'base64');
  if (masterKey.length !== KEY_BYTES) {
    throw new Error(
      `GRID_ENCRYPTION_KEY must decode to exactly ${KEY_BYTES} bytes (got ${masterKey.length}).`,
    );
  }
  // Derive a separate sub-key for HMAC so the encryption key and
  // the HMAC key are cryptographically independent.
  const derived = crypto.hkdfSync(
    'sha256',
    masterKey,
    Buffer.alloc(0),            // no salt (key is already high-entropy)
    Buffer.from('email-hash'),  // info tag — domain separation
    KEY_BYTES,
  );
  // hkdfSync returns ArrayBuffer — wrap it in a Buffer.
  cachedHmacKey = Buffer.from(derived);
  return cachedHmacKey;
}

/**
 * Compute a deterministic, non-reversible hash of an email address
 * for use as a unique lookup key.
 *
 * The email is normalized (trimmed + lowercased) before hashing so
 * "User@Example.com" and "user@example.com" produce the same hash.
 */
export function hashEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const key = getHmacKey();
  return crypto
    .createHmac('sha256', key)
    .update(normalized)
    .digest('base64url'); // URL-safe, no padding, 43 chars
}
