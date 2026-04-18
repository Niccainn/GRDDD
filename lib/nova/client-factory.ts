/**
 * Anthropic client factory — resolves the right API key for a given
 * environment based on the deployment's beta tier, then returns a
 * ready-to-use SDK client.
 *
 * This is the one and only place in the codebase that chooses which
 * API key to use for Nova. Every Anthropic call site in the kernel
 * goes through here. The previous design instantiated a module-level
 * singleton at boot time with process.env.ANTHROPIC_API_KEY — that's
 * the thing this file replaces. Singletons can't do per-tenant BYOK.
 *
 * Resolution rules (see lib/config.ts for tier meanings):
 *
 *   tier = 'closed'
 *     - If the environment has its own key, use it (early adopters
 *       who want to BYOK even in closed beta are welcome).
 *     - Otherwise fall back to process.env.ANTHROPIC_API_KEY (the
 *       platform key), subject to the daily token cap.
 *     - If neither exists, throw MissingKeyError.
 *
 *   tier = 'byok' | 'live'
 *     - If the environment has its own key, use it.
 *     - Otherwise throw MissingKeyError immediately. Nova will not
 *       run without a tenant key in these tiers, so the user sees
 *       a clear "connect your account" prompt instead of a silent
 *       fall-through to the platform key.
 *
 * Callers should catch MissingKeyError and surface it via the UI
 * event stream as a NovaEvent { type: 'error', message } with a
 * deep link to /settings/ai.
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';
import { getBetaTier } from '@/lib/config';

export type KeySource = 'byok' | 'platform';

export type ResolvedClient = {
  client: Anthropic;
  /** Where the key came from — useful for metering, logging, UI badges. */
  source: KeySource;
  /** Display-safe preview, e.g. "sk-ant-...a7f3". Never the raw key. */
  maskedKey: string;
};

/**
 * Thrown when the tier requires a BYOK key and none is present on
 * the environment. The UI should catch this, render a "connect your
 * Anthropic account" CTA, and deep-link to /settings/ai. The message
 * is user-facing — keep it actionable and non-technical.
 */
export class MissingKeyError extends Error {
  readonly actionUrl = '/settings/ai';
  constructor(message = 'Connect your Anthropic account to activate Nova.') {
    super(message);
    this.name = 'MissingKeyError';
  }
}

/**
 * Resolve the Anthropic client for a given environment. This is an
 * async function because we do a Prisma fetch to read the tenant's
 * BYOK key. Callers should hold the resolved client for the entire
 * duration of a single Nova invocation — do NOT cache it across
 * invocations because the user can rotate their key mid-session.
 */
export async function getAnthropicClientForEnvironment(
  environmentId: string,
): Promise<ResolvedClient> {
  const env = await prisma.environment.findUnique({
    where: { id: environmentId },
    select: {
      id: true,
      anthropicKeyEnc: true,
      anthropicKeyPreview: true,
      tokensUsed: true,
    },
  });

  if (!env) {
    throw new MissingKeyError('Environment not found.');
  }

  const tier = getBetaTier();

  // Prefer the tenant's own key whenever present, regardless of tier.
  // BYOK always wins over the platform key — users who paste their
  // own key expect to be billed on it, even in closed beta.
  if (env.anthropicKeyEnc) {
    let plaintext: string;
    try {
      plaintext = decryptString(env.anthropicKeyEnc);
    } catch {
      // Decrypt failures usually mean GRID_ENCRYPTION_KEY was rotated
      // without re-encrypting the DB, or the row was tampered with.
      // Either way, the stored key is unusable — surface a clear
      // reconnect prompt rather than leaking the failure mode.
      throw new MissingKeyError(
        'Your stored Anthropic key could not be read. Please reconnect your account.',
      );
    }
    return {
      client: new Anthropic({ apiKey: plaintext }),
      source: 'byok',
      maskedKey: env.anthropicKeyPreview ?? 'sk-ant-...****',
    };
  }

  // No tenant key. Branch on tier.
  if (tier === 'closed') {
    const platformKey = process.env.ANTHROPIC_API_KEY;
    if (!platformKey) {
      throw new MissingKeyError(
        'No Anthropic key is configured. Contact the workspace owner to connect one.',
      );
    }

    // Check trial budget: new environments get 50,000 tokens on the
    // platform key. After exhaustion, they must BYOK.
    const TRIAL_BUDGET = 50_000;
    const used = env.tokensUsed ?? 0;
    if (used >= TRIAL_BUDGET) {
      throw new MissingKeyError(
        `You've used your ${Math.floor(TRIAL_BUDGET / 10_000)} free trial runs. Connect your Anthropic API key to continue using Nova.`,
      );
    }

    return {
      client: new Anthropic({ apiKey: platformKey }),
      source: 'platform',
      maskedKey: 'sk-ant-...trial',
    };
  }

  // byok / live tiers: refuse to fall back to the platform key. The
  // user must connect their own account. This is the contract that
  // lets us promise "zero marginal cost per user."
  throw new MissingKeyError();
}

/**
 * Lightweight validation helper used by the settings route when a
 * user pastes a new key. Makes the cheapest possible real call
 * against the Anthropic API (a 1-token Haiku message) to confirm
 * (a) the key is syntactically valid and (b) the key is live and
 * has quota. Returns true on success, throws with Anthropic's own
 * error message on failure so the UI can show e.g. "invalid API
 * key" vs "quota exceeded" verbatim.
 */
export async function validateAnthropicKey(rawKey: string): Promise<void> {
  const client = new Anthropic({ apiKey: rawKey });
  // Haiku is the cheapest model. 1-token ping costs fractions of a
  // cent on the USER's key — nothing on ours.
  await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1,
    messages: [{ role: 'user', content: 'hi' }],
  });
}
