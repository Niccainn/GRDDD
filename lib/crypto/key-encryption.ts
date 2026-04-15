/**
 * Symmetric encryption for sensitive strings at rest — used for BYOK
 * Anthropic API keys (and anything else with the same threat model).
 *
 * Algorithm: AES-256-GCM with a 12-byte random nonce and 16-byte auth
 * tag. The key is read from GRID_ENCRYPTION_KEY (32 bytes, base64).
 * GCM is authenticated encryption, so tampering with the ciphertext
 * or nonce fails the decrypt rather than silently returning garbage.
 *
 * Threat model we're defending against:
 *   - Database leak / backup exfiltration → attacker sees ciphertext,
 *     doesn't have GRID_ENCRYPTION_KEY, cannot recover plaintext.
 *   - Prod logs accidentally printing an Environment row → only
 *     anthropicKeyEnc leaks, not the raw sk-ant-... key.
 *   - Read-only DB compromise (e.g. an analytics replica) → same as
 *     leak: ciphertext without the key is useless.
 *
 * Threat model we are NOT defending against:
 *   - Full server RCE — if the attacker runs code in our process they
 *     have GRID_ENCRYPTION_KEY in memory. This class of attack needs
 *     KMS integration (AWS KMS, GCP KMS, Vault Transit) to handle;
 *     that's a v2 upgrade, not a v1 requirement.
 *
 * Format of ciphertext as stored in the DB:
 *   base64(nonce) + "." + base64(ciphertext) + "." + base64(authTag)
 *
 * Using "." as separator (not ":") because ":" is common in tokens
 * and we want the stored form to be URL-safe base64 friendly.
 */

import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const NONCE_BYTES = 12;
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;

/**
 * Load and cache the encryption key. We cache the decoded Buffer so
 * every encrypt/decrypt doesn't pay the base64-decode cost.
 *
 * If GRID_ENCRYPTION_KEY is missing we throw immediately — this is a
 * fail-fast on boot rather than a silent pass-through that would
 * store plaintext by accident. The caller should catch and surface
 * a clear "missing env var" message.
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.GRID_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'GRID_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32',
    );
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `GRID_ENCRYPTION_KEY must decode to exactly ${KEY_BYTES} bytes (got ${buf.length}). Generate with: openssl rand -base64 32`,
    );
  }
  cachedKey = buf;
  return buf;
}

/**
 * Encrypt a UTF-8 plaintext string. Returns the stored form:
 *   base64(nonce).base64(ciphertext).base64(authTag)
 */
export function encryptString(plaintext: string): string {
  const key = getKey();
  const nonce = crypto.randomBytes(NONCE_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [nonce.toString('base64'), ciphertext.toString('base64'), authTag.toString('base64')].join('.');
}

/**
 * Decrypt a ciphertext produced by encryptString. Throws on any
 * tampering, corruption, or wrong-key scenario. Callers should catch
 * and treat "decrypt failed" as "this key is unusable" — usually
 * that means clearing the stored ciphertext and asking the user to
 * reconnect their account.
 */
export function decryptString(stored: string): string {
  const key = getKey();
  const parts = stored.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed ciphertext: expected nonce.ciphertext.tag');
  }
  const [nonceB64, ciphertextB64, tagB64] = parts;
  const nonce = Buffer.from(nonceB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  if (nonce.length !== NONCE_BYTES) throw new Error('Malformed nonce');
  if (tag.length !== 16) throw new Error('Malformed auth tag');

  const decipher = crypto.createDecipheriv(ALGO, key, nonce);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Build a safe-to-display preview of a secret string. Returns the
 * first prefix + "..." + the last 4 characters. For "sk-ant-api03-
 * abcdefghXYZA7F3" you get "sk-ant-...A7F3". Safe to log, safe to
 * render in a UI, safe to store alongside the ciphertext.
 *
 * We include the prefix because seeing "sk-ant-" confirms it's an
 * Anthropic key and not e.g. an OpenAI key pasted by mistake. The
 * last 4 characters are enough for a user to visually confirm it
 * matches what they copied from console.anthropic.com.
 */
export function buildKeyPreview(plaintext: string): string {
  const trimmed = plaintext.trim();
  if (trimmed.length < 12) return '****';
  const prefix = trimmed.startsWith('sk-ant-') ? 'sk-ant-' : trimmed.slice(0, 6);
  const suffix = trimmed.slice(-4);
  return `${prefix}...${suffix}`;
}
