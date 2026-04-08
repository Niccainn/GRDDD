import { prisma } from './db';

// Claude model pricing (per million tokens, USD)
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':   { input: 15.0, output: 75.0 },
  'claude-sonnet-4-6': { input: 3.0,  output: 15.0 },
  'claude-haiku-4-5':  { input: 0.80, output: 4.0  },
  // Fallback
  'default':           { input: 3.0,  output: 15.0 },
};

/**
 * Calculate cost in USD from token counts.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model] ?? PRICING['default'];
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

/**
 * Check if environment has budget remaining.
 * Returns { allowed, budget, used, remaining }.
 * If no budget set, always allowed.
 */
export async function checkBudget(environmentId: string): Promise<{
  allowed: boolean;
  budget: number | null;
  used: number;
  remaining: number | null;
}> {
  const env = await prisma.environment.findUnique({
    where: { id: environmentId },
    select: { tokenBudget: true, tokensUsed: true, budgetResetAt: true },
  });

  if (!env) return { allowed: false, budget: null, used: 0, remaining: null };

  // Auto-reset monthly
  if (env.budgetResetAt && env.budgetResetAt < new Date()) {
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);
    await prisma.environment.update({
      where: { id: environmentId },
      data: { tokensUsed: 0, budgetResetAt: nextReset },
    });
    return { allowed: true, budget: env.tokenBudget, used: 0, remaining: env.tokenBudget };
  }

  if (env.tokenBudget === null) {
    return { allowed: true, budget: null, used: env.tokensUsed, remaining: null };
  }

  const remaining = env.tokenBudget - env.tokensUsed;
  return {
    allowed: remaining > 0,
    budget: env.tokenBudget,
    used: env.tokensUsed,
    remaining,
  };
}

/**
 * Record token usage — atomic increment.
 */
export async function recordTokenUsage(environmentId: string, tokens: number): Promise<void> {
  await prisma.environment.update({
    where: { id: environmentId },
    data: { tokensUsed: { increment: tokens } },
  });
}

/**
 * Check if budget alert threshold (80%) is reached.
 */
export function isBudgetAlert(used: number, budget: number | null): boolean {
  if (budget === null) return false;
  return used >= budget * 0.8;
}
