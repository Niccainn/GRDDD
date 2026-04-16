/**
 * Field-level encryption for PII (Personally Identifiable Information).
 *
 * Protects Identity fields (name, email) and prompt/input fields on
 * KernelTrace and IntelligenceLog at rest. Uses the same AES-256-GCM
 * algorithm and GRID_ENCRYPTION_KEY as key-encryption.ts, but adds a
 * deterministic prefix ("pii:") so we can distinguish encrypted values
 * from plaintext during a rolling migration.
 *
 * Migration safety: `decryptPII` gracefully falls back to returning
 * the raw value when decryption fails (e.g. the value is still
 * plaintext from before encryption was enabled). This lets us roll
 * out encryption writes first and backfill existing rows later
 * without downtime.
 *
 * Stored format:  pii:<base64(nonce)>.<base64(ciphertext)>.<base64(authTag)>
 *
 * The "pii:" prefix is NOT part of the cryptographic payload — it's
 * stripped before decrypt and only exists so `isEncrypted()` can do a
 * cheap string check without attempting a full decrypt.
 */

import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const NONCE_BYTES = 12;
const KEY_BYTES = 32;
const PII_PREFIX = 'pii:';

let cachedKey: Buffer | null = null;

function getKey(): Buffer | null {
  if (cachedKey) return cachedKey;
  const raw = process.env.GRID_ENCRYPTION_KEY;
  if (!raw) {
    return null;
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== KEY_BYTES) {
    console.warn(
      `[pii] GRID_ENCRYPTION_KEY must decode to exactly ${KEY_BYTES} bytes (got ${buf.length}). Encryption disabled.`,
    );
    return null;
  }
  cachedKey = buf;
  return buf;
}

/**
 * Returns true if the value looks like it was encrypted by `encryptPII`.
 * This is a cheap prefix check — it does NOT verify the ciphertext is
 * valid or that we hold the correct key.
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PII_PREFIX);
}

/**
 * Encrypt a UTF-8 plaintext string for PII storage. Returns the
 * prefixed stored form:
 *   pii:base64(nonce).base64(ciphertext).base64(authTag)
 *
 * Idempotent: if the value is already encrypted (has the prefix),
 * it is returned as-is to avoid double-encryption.
 */
export function encryptPII(plaintext: string): string {
  if (isEncrypted(plaintext)) return plaintext;

  const key = getKey();
  if (!key) return plaintext; // No key — store plaintext (dev/migration mode)
  const nonce = crypto.randomBytes(NONCE_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return (
    PII_PREFIX +
    [
      nonce.toString('base64'),
      ciphertext.toString('base64'),
      authTag.toString('base64'),
    ].join('.')
  );
}

/**
 * Decrypt a PII ciphertext produced by `encryptPII`.
 *
 * Migration-safe: if the value doesn't carry the "pii:" prefix or if
 * decryption fails (wrong key, corrupted data, still-plaintext legacy
 * row), the raw input is returned instead of throwing. This lets the
 * app read both encrypted and plaintext rows during a rolling migration.
 */
export function decryptPII(ciphertext: string): string {
  if (!isEncrypted(ciphertext)) return ciphertext;

  try {
    const payload = ciphertext.slice(PII_PREFIX.length);
    const parts = payload.split('.');
    if (parts.length !== 3) return ciphertext;

    const [nonceB64, ctB64, tagB64] = parts;
    const nonce = Buffer.from(nonceB64, 'base64');
    const ct = Buffer.from(ctB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');

    if (nonce.length !== NONCE_BYTES) return ciphertext;
    if (tag.length !== 16) return ciphertext;

    const key = getKey();
    if (!key) return ciphertext; // No key — can't decrypt
    const decipher = crypto.createDecipheriv(ALGO, key, nonce);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plaintext.toString('utf8');
  } catch {
    // Decryption failed — return the raw value so the app doesn't
    // crash on legacy plaintext rows during migration.
    return ciphertext;
  }
}
