/**
 * Higher-level helpers that encrypt/decrypt PII fields on specific
 * domain models. These sit between the raw `encryptPII`/`decryptPII`
 * primitives and the Prisma call sites so each consumer doesn't have
 * to remember which fields are sensitive.
 *
 * Usage (future integration — not wired up yet):
 *
 *   // Before a Prisma create/update on Identity:
 *   const encrypted = encryptIdentityPII({ email, name });
 *   await prisma.identity.create({ data: { ...rest, ...encrypted } });
 *
 *   // After a Prisma read:
 *   const identity = await prisma.identity.findUnique({ ... });
 *   const { email, name } = decryptIdentityPII(identity);
 *
 *   // Before writing a KernelTrace or IntelligenceLog prompt:
 *   const safeInput = encryptPromptPII(rawInput);
 *
 *   // After reading:
 *   const clearInput = decryptPromptPII(log.input);
 */

import { encryptPII, decryptPII } from './pii-encryption';

// ---------------------------------------------------------------------------
// Identity PII (email + name)
// ---------------------------------------------------------------------------

/**
 * Encrypt the PII fields on an Identity-shaped object before writing
 * to the database. Non-PII fields are untouched.
 */
export function encryptIdentityPII(data: {
  email: string;
  name?: string | null;
}): { email: string; name: string | null } {
  return {
    email: encryptPII(data.email),
    name: data.name != null ? encryptPII(data.name) : null,
  };
}

/**
 * Decrypt the PII fields on an Identity row read from the database.
 * Migration-safe: plaintext values pass through unchanged.
 */
export function decryptIdentityPII(data: {
  email: string;
  name?: string | null;
}): { email: string; name: string | null } {
  return {
    email: decryptPII(data.email),
    name: data.name != null ? decryptPII(data.name) : null,
  };
}

// ---------------------------------------------------------------------------
// Prompt PII (KernelTrace.payload / summary, IntelligenceLog.input / output)
// ---------------------------------------------------------------------------

/**
 * Encrypt a prompt or input/output string before storing it on
 * KernelTrace or IntelligenceLog rows.
 */
export function encryptPromptPII(prompt: string): string {
  return encryptPII(prompt);
}

/**
 * Decrypt a prompt or input/output string read from KernelTrace or
 * IntelligenceLog. Migration-safe: plaintext values pass through.
 */
export function decryptPromptPII(prompt: string): string {
  return decryptPII(prompt);
}
