import crypto from 'crypto';

const PREFIX = 'grd_';
const KEY_BYTES = 32;

/** Generate a new random API key and its hash */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = crypto.randomBytes(KEY_BYTES).toString('base64url');
  const key = `${PREFIX}${raw}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.slice(0, 12); // "grd_" + 8 chars
  return { key, hash, prefix };
}

/** Hash a provided key for lookup */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
