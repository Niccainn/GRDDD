/**
 * Decrypt Identity PII fields when reading via a Prisma relation.
 *
 * Why this helper exists:
 *   The Prisma extension in lib/db.ts auto-decrypts Identity.name and
 *   Identity.email — but only when the top-level query target is
 *   `identity` (prisma.identity.findUnique, etc). When you query a
 *   different model and pull Identity in via a relation —
 *
 *     prisma.task.findMany({
 *       include: { creator: { select: { name: true, email: true } } }
 *     })
 *
 *   — the extension does NOT fire and ciphertext flows through to
 *   the JSON response. PR #30 was a critical leak from exactly this
 *   pattern (env page rendered "pii:7R3VnlY9..." in the OWNED BY field).
 *
 *   Rather than asking every caller to remember to wrap with
 *   decryptPII(), this helper provides a single function that takes
 *   any object with name/email fields and returns it with both
 *   decrypted (and other fields unchanged).
 *
 * Usage:
 *   const tasks = await prisma.task.findMany({
 *     include: { creator: { select: { id: true, name: true } } },
 *   });
 *   return Response.json(
 *     tasks.map(t => ({ ...t, creator: decryptIdentityFields(t.creator) })),
 *   );
 *
 * decryptPII() returns plaintext unchanged for values not prefixed
 * with the encryption marker, so this is a no-op on already-plaintext
 * values (test fixtures, legacy rows from before encryption was
 * enabled). Safe to apply liberally.
 */

import { decryptPII } from './pii-encryption';

type IdentityFields = {
  name?: string | null;
  email?: string | null;
};

/**
 * Returns a copy of `obj` with `name` and `email` fields decrypted.
 * Returns null/undefined unchanged for absent values. Other fields
 * pass through.
 */
export function decryptIdentityFields<T extends IdentityFields>(
  obj: T,
): T;
export function decryptIdentityFields<T extends IdentityFields>(
  obj: T | null,
): T | null;
export function decryptIdentityFields<T extends IdentityFields>(
  obj: T | null | undefined,
): T | null {
  if (!obj) return obj ?? null;
  const out: T = { ...obj };
  if (typeof obj.name === 'string') {
    out.name = decryptPII(obj.name) as T['name'];
  }
  if (typeof obj.email === 'string') {
    out.email = decryptPII(obj.email) as T['email'];
  }
  return out;
}
