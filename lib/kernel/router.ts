/**
 * Nova Kernel — Model Router
 *
 * Maps abstract tier names to concrete Anthropic models. Centralizing
 * this lets us swap models without touching tool code or UI code. It
 * also gives us one place to implement cost-based downgrades, traffic
 * splitting, and per-tenant model overrides.
 */

import type { ModelTier } from './types';

interface ModelProfile {
  id: string;
  /** Input cost per million tokens, USD. */
  inputPerM: number;
  /** Output cost per million tokens, USD. */
  outputPerM: number;
  /** Default max_tokens the kernel will request from this model. */
  defaultMaxTokens: number;
  /** Prompt caching supported? */
  caching: boolean;
}

// Profiles current as of launch. Update these as Anthropic pricing evolves.
const MODELS: Record<ModelTier, ModelProfile> = {
  fast: {
    id: 'claude-haiku-4-5',
    inputPerM: 1.0,
    outputPerM: 5.0,
    defaultMaxTokens: 1024,
    caching: true,
  },
  balanced: {
    id: 'claude-sonnet-4-5',
    inputPerM: 3.0,
    outputPerM: 15.0,
    defaultMaxTokens: 2048,
    caching: true,
  },
  deep: {
    id: 'claude-opus-4-6',
    inputPerM: 15.0,
    outputPerM: 75.0,
    defaultMaxTokens: 4096,
    caching: true,
  },
};

export interface RoutingDecision {
  tier: ModelTier;
  model: string;
  reason: string;
  profile: ModelProfile;
}

/**
 * Pick a model for a request.
 *
 * The heuristic (in priority order):
 *   1. If the caller specified a tier, use it — they know best.
 *   2. If there are no tools and the input is short, use "fast".
 *   3. If tools are involved, minimum "balanced".
 *   4. If the system prompt contains strategy/planning markers, bump to "deep".
 *   5. If the tenant has a per-tenant override (future: memory-driven), honor it.
 */
export function route(params: {
  preferredTier?: ModelTier;
  toolCount: number;
  userMessageChars: number;
  systemPromptHint?: string;
}): RoutingDecision {
  const { preferredTier, toolCount, userMessageChars, systemPromptHint } = params;

  if (preferredTier) {
    return {
      tier: preferredTier,
      model: MODELS[preferredTier].id,
      profile: MODELS[preferredTier],
      reason: 'caller specified tier',
    };
  }

  const hint = (systemPromptHint || '').toLowerCase();
  const isStrategic =
    hint.includes('strategy') ||
    hint.includes('plan') ||
    hint.includes('synthesize') ||
    hint.includes('cross-environment');

  if (isStrategic) {
    return {
      tier: 'deep',
      model: MODELS.deep.id,
      profile: MODELS.deep,
      reason: 'strategic / cross-env reasoning',
    };
  }

  if (toolCount > 0) {
    return {
      tier: 'balanced',
      model: MODELS.balanced.id,
      profile: MODELS.balanced,
      reason: 'tool-using agentic loop',
    };
  }

  if (userMessageChars < 200) {
    return {
      tier: 'fast',
      model: MODELS.fast.id,
      profile: MODELS.fast,
      reason: 'short, toolless query',
    };
  }

  return {
    tier: 'balanced',
    model: MODELS.balanced.id,
    profile: MODELS.balanced,
    reason: 'default balanced',
  };
}

export function computeCostUsd(
  tier: ModelTier,
  tokens: { input: number; output: number }
): number {
  const p = MODELS[tier];
  return (tokens.input / 1_000_000) * p.inputPerM + (tokens.output / 1_000_000) * p.outputPerM;
}

export function modelProfile(tier: ModelTier): ModelProfile {
  return MODELS[tier];
}
