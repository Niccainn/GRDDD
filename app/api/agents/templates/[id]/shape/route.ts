/**
 * POST /api/agents/templates/[id]/shape
 *
 * Two-stage personalization of a blueprint:
 *
 *   1. Synchronous hydration — substitute {{tokens}} from the target
 *      environment + user answers into the skeleton. This always runs
 *      and always returns instantly.
 *
 *   2. Optional AI shaping — if `refine: true` is in the body, we ask
 *      Claude to rewrite the hydrated prompt for this specific business,
 *      tightening the language, dropping anything that doesn't fit, and
 *      adding business-specific specificity. This costs a real Claude
 *      call against the environment's BYOK envelope, so it's opt-in and
 *      budget-gated.
 *
 * The response always includes the hydrated prompt. If `refine` was
 * requested the response also includes a `refinedPrompt` — the caller
 * can show both side-by-side and let the user pick.
 *
 * Body: { environmentId: string, answers: Record<string, string>, refine?: boolean }
 */

import { NextRequest } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { getAuthIdentity } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { findBlueprint, hydrateBlueprint } from '@/lib/agents/templates';
import {
  getAnthropicClientForEnvironment,
  MissingKeyError,
} from '@/lib/nova/client-factory';
import { checkBudget, recordTokenUsage, calculateCost } from '@/lib/cost';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const blueprint = findBlueprint(id);
  if (!blueprint) {
    return Response.json({ error: 'Unknown blueprint' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const environmentId: string | undefined = body?.environmentId;
  const answers: Record<string, string> =
    body?.answers && typeof body.answers === 'object' ? body.answers : {};
  const refine = body?.refine === true;

  if (!environmentId || typeof environmentId !== 'string') {
    return Response.json({ error: 'environmentId required' }, { status: 400 });
  }

  // Scope: the caller must be an ADMIN or CONTRIBUTOR on the target
  // environment. VIEWERs can see templates but can't shape them into
  // an environment they don't write to.
  const env = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        {
          memberships: {
            some: {
              identityId: identity.id,
              role: { in: ['ADMIN', 'CONTRIBUTOR'] },
            },
          },
        },
      ],
    },
    select: { id: true, name: true, description: true },
  });
  if (!env) return Response.json({ error: 'Environment not found' }, { status: 404 });

  // Stage 1: synchronous hydration. This is free and instant.
  const hydratedPrompt = hydrateBlueprint(blueprint, env, answers);

  if (!refine) {
    return Response.json({
      blueprintId: blueprint.id,
      title: blueprint.title,
      emoji: blueprint.emoji,
      defaultName: blueprint.defaultName,
      defaultDescription: blueprint.defaultDescription,
      prompt: hydratedPrompt,
    });
  }

  // Stage 2: optional AI refinement. Budget-gate before making the call.
  const budget = await checkBudget(env.id);
  if (!budget.allowed) {
    // Still return the hydrated prompt so the user isn't stuck.
    return Response.json({
      blueprintId: blueprint.id,
      title: blueprint.title,
      emoji: blueprint.emoji,
      defaultName: blueprint.defaultName,
      defaultDescription: blueprint.defaultDescription,
      prompt: hydratedPrompt,
      refineError: 'Environment token budget is exhausted — refinement skipped.',
    });
  }

  let client: Anthropic;
  try {
    const resolved = await getAnthropicClientForEnvironment(env.id);
    client = resolved.client;
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return Response.json({
        blueprintId: blueprint.id,
        title: blueprint.title,
        emoji: blueprint.emoji,
        defaultName: blueprint.defaultName,
        defaultDescription: blueprint.defaultDescription,
        prompt: hydratedPrompt,
        refineError:
          'No Anthropic key configured for this environment — refinement skipped.',
      });
    }
    throw err;
  }

  // Shaping meta-prompt. Intentionally constrained: the model may
  // only edit the prompt to make it more specific to the business —
  // it may not drop the structured-output marker format, because
  // the whole downstream rendering pipeline depends on it.
  const system = `You are shaping an AI agent prompt for a specific business so that the agent, when run, will produce output that is materially tailored to that business.

Rules you must follow:
1. PRESERVE the ::tldr::, ::heading::, ::metric::, ::table::, ::end:: block markers exactly as they appear in the input. The dashboard renders them as typed blocks — breaking the markers breaks the UI.
2. PRESERVE the overall section structure and intent.
3. You MAY tighten language, drop sentences that don't apply to this specific business, and add business-specific specificity (e.g. reference the business's actual channel, stage, or model by name instead of generic placeholders).
4. You MAY NOT invent metrics, KPIs, or facts the user did not provide. If a value is unknown, leave the skeleton placeholder or write "(not specified)".
5. Return ONLY the revised prompt. No preamble, no explanation, no commentary.`;

  const userMessage = `Business: ${env.name}
Business context: ${env.description?.trim() || '(no description on file)'}

User-provided shaping answers:
${blueprint.questions
  .map((q) => `- ${q.label}: ${(answers[q.key] ?? q.default ?? '').trim() || '(not specified)'}`)
  .join('\n')}

Here is the current prompt skeleton for this blueprint. Rewrite it to be specific to this business while following all rules above:

---
${hydratedPrompt}
---`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });

    const refinedPrompt = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('\n\n')
      .trim();

    const totalTokens = response.usage.input_tokens + response.usage.output_tokens;
    const cost = calculateCost(
      'claude-sonnet-4-6',
      response.usage.input_tokens,
      response.usage.output_tokens,
    );
    await recordTokenUsage(env.id, totalTokens);

    return Response.json({
      blueprintId: blueprint.id,
      title: blueprint.title,
      emoji: blueprint.emoji,
      defaultName: blueprint.defaultName,
      defaultDescription: blueprint.defaultDescription,
      prompt: hydratedPrompt,
      refinedPrompt,
      refineTokens: totalTokens,
      refineCost: cost,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({
      blueprintId: blueprint.id,
      title: blueprint.title,
      emoji: blueprint.emoji,
      defaultName: blueprint.defaultName,
      defaultDescription: blueprint.defaultDescription,
      prompt: hydratedPrompt,
      refineError: `Refinement failed: ${message}`,
    });
  }
}
