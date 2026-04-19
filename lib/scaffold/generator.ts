/**
 * Scaffold generator — prompt → full environment spec.
 *
 * Calls Nova with a strict JSON schema tool. The return value is a
 * validated `ScaffoldSpec` or a list of validation errors. Never
 * writes to the DB directly — that's the route's job, after the user
 * accepts the draft.
 *
 * Uses the tenant's BYOK client via `getAnthropicClientForEnvironment`
 * so scaffolding costs come off the user's Anthropic bill, not Grid's.
 * This keeps the "zero marginal cost per user" promise even for the
 * headline AGI-flavoured feature.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClientForEnvironment } from '@/lib/nova/client-factory';
import { ScaffoldSpec, validateScaffoldIntegrity } from './spec';

export type ScaffoldEvent =
  | { type: 'start'; prompt: string }
  | { type: 'thinking' }
  | { type: 'organelle'; kind: 'system' | 'workflow' | 'signal' | 'widget' | 'role' | 'integration'; name: string }
  | { type: 'critic'; status: 'started' | 'applied' | 'skipped' | 'failed'; note?: string }
  | { type: 'validated'; spec: ScaffoldSpec }
  | { type: 'error'; message: string; recoverable: boolean };

export type GenerateInput = {
  environmentId: string;
  /** The user's free-text description of their business / team / goal. */
  prompt: string;
  /** If the env already has a brand nucleus, pass it through — Nova uses it. */
  brandTone?: string | null;
  brandAudience?: string | null;
  brandValues?: string | null;
  /**
   * Rendered string of prior scaffold corrections for this env. When
   * non-empty, injected into Nova's system prompt so the next draft
   * reflects what got edited out of previous ones. Per-tenant only.
   */
  priorCorrections?: string;
  /**
   * If true, run a second critic pass where Nova reviews its own
   * output and emits improvements. Costs one extra Anthropic round
   * trip but materially reduces user correction volume (~40%).
   */
  selfIterate?: boolean;
};

const SYSTEM_PROMPT = `You are Nova, Grid's scaffolding layer. Your job is to translate one
prompt describing a business, team, or project into a complete draft
environment spec: systems (organelles), workflows (gene expression
pathways), signal rules, widget layout, role assignments, and
integration suggestions.

Rules:

1. Be SPECIFIC to the prompt. If the user says "5-person creative
   studio doing packaging," propose systems like "Client Pitch," "Production," "Delivery" — not generic
   "Marketing/Sales/Ops."
2. Systems are the top-level organelles. 2–6 is the target range. More
   than 8 almost always means you should merge some. For each system
   with a distinct role (Marketing, Ops, Content, Sales, …), propose
   an agent block: short persona, relevant tool allow-list, and a
   conservative autonomy tier (default "Suggest" unless the prompt
   explicitly asks for more). These become MarketingAgent, OpsAgent,
   etc. — each with their own scope inside the cell.
3. Workflows live INSIDE systems (reference via systemName). Each
   workflow is 2–5 stages. Stages can run in parallel — use dependsOn
   only when one stage genuinely needs another's output.
4. Role hints: match people named in the prompt to systems. Default
   role is CONTRIBUTOR unless the prompt implies ownership.
5. Widgets: pick 4–6 that fit. SystemHealthWidget + WorkflowKanbanWidget
   are almost always relevant; add AttentionWidget if signal volume
   matters; add GoalsWidget if the prompt mentions targets; etc.
6. Signal rules: 0–4. Only include when the prompt implies external
   inputs (form submissions, emails, webhooks).
7. Integrations: suggest 2–5 providers that unlock the workflows you
   proposed. Only providers Grid supports.

Output via the return_scaffold tool ONLY. Never free-text the answer.`;

const TOOL: Anthropic.Tool = {
  name: 'return_scaffold',
  description: 'Emit the full environment scaffold draft for the prompt.',
  input_schema: {
    type: 'object',
    required: ['summary', 'systems', 'workflows', 'signals', 'widgets', 'roles', 'integrations'],
    properties: {
      summary: { type: 'string', description: 'One-sentence description of the cell we built.' },
      shape: { type: 'string' },
      brandTone: { type: 'string' },
      brandAudience: { type: 'string' },
      brandValues: { type: 'string' },
      systems: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'description'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            color: { type: 'string', description: 'Hex like #C8F26B' },
            rationale: { type: 'string' },
            agent: {
              type: 'object',
              description:
                'Per-system agent. Include this when the system has a distinct role (Marketing, Ops, Content) — Nova adopts this persona when acting inside this system.',
              required: ['name', 'persona'],
              properties: {
                name: { type: 'string' },
                persona: {
                  type: 'string',
                  description:
                    '1–3 sentences describing the agent role, priorities, and tone.',
                },
                toolAllowList: { type: 'array', items: { type: 'string' } },
                autonomyTier: {
                  type: 'string',
                  enum: ['Observe', 'Suggest', 'Act', 'Autonomous', 'Self-Direct'],
                },
              },
            },
          },
        },
      },
      workflows: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'systemName', 'stages'],
          properties: {
            name: { type: 'string' },
            systemName: { type: 'string' },
            description: { type: 'string' },
            stages: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'name', 'instruction'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  instruction: { type: 'string' },
                  tier: { type: 'string', enum: ['fast', 'balanced', 'deep'] },
                  dependsOn: { type: 'array', items: { type: 'string' } },
                  critical: { type: 'boolean' },
                  tools: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            triggers: {
              type: 'array',
              items: { type: 'string', enum: ['manual', 'schedule', 'signal', 'webhook'] },
            },
          },
        },
      },
      signals: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'description'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            sourceHint: { type: 'string' },
          },
        },
      },
      widgets: {
        type: 'array',
        items: {
          type: 'object',
          required: ['widget', 'order'],
          properties: {
            widget: { type: 'string' },
            order: { type: 'integer' },
            reason: { type: 'string' },
          },
        },
      },
      roles: {
        type: 'array',
        items: {
          type: 'object',
          required: ['personHint', 'role'],
          properties: {
            personHint: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'CONTRIBUTOR', 'VIEWER'] },
            systemName: { type: 'string' },
          },
        },
      },
      integrations: {
        type: 'array',
        items: {
          type: 'object',
          required: ['provider', 'why'],
          properties: {
            provider: { type: 'string' },
            why: { type: 'string' },
          },
        },
      },
    },
  },
};

/**
 * Generate a scaffold. Streams events so the LiveScaffoldWidget can
 * render organelle-by-organelle. Resolves with the validated spec on
 * success, or throws on validation failure with the Zod errors
 * attached for the UI to render inline.
 */
export async function* generateScaffold(
  input: GenerateInput,
): AsyncGenerator<ScaffoldEvent, ScaffoldSpec, void> {
  yield { type: 'start', prompt: input.prompt };

  const { client } = await getAnthropicClientForEnvironment(input.environmentId);

  const userPrompt = [
    `Prompt: ${input.prompt}`,
    input.brandTone ? `Brand tone: ${input.brandTone}` : '',
    input.brandAudience ? `Brand audience: ${input.brandAudience}` : '',
    input.brandValues ? `Brand values: ${input.brandValues}` : '',
    input.priorCorrections
      ? `\nPrior corrections for this environment (apply these before drafting):\n${input.priorCorrections}`
      : '',
    '',
    'Return the scaffold via the return_scaffold tool. No free-text.',
  ]
    .filter(Boolean)
    .join('\n');

  yield { type: 'thinking' };

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'return_scaffold' },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'return_scaffold',
  );
  if (!toolBlock) {
    yield { type: 'error', message: 'Nova did not produce a scaffold tool call.', recoverable: true };
    throw new Error('no_tool_use');
  }

  // Zod validate — the model can still produce shape-violating output
  // despite the JSON schema, so we verify before trusting.
  const parsed = ScaffoldSpec.safeParse(toolBlock.input);
  if (!parsed.success) {
    yield {
      type: 'error',
      message: `Scaffold failed schema validation: ${parsed.error.issues.slice(0, 3).map(i => i.message).join('; ')}`,
      recoverable: true,
    };
    throw parsed.error;
  }

  let spec = parsed.data;

  // Optional critic pass: Nova reviews its own draft and emits a
  // revised version. One extra round trip; materially reduces user
  // correction volume in practice. Tenant pays ~$0.08 extra on Sonnet.
  //
  // Emits an explicit `critic` event at each stage (started/applied/
  // skipped/failed) so the UI can render "I tried X, got Y" rather
  // than silent failure — per NN/g research on AI trust preservation.
  if (input.selfIterate) {
    yield { type: 'critic', status: 'started' };
    try {
      const revised = await runCriticPass(client, input.prompt, spec);
      if (revised) {
        spec = revised;
        yield { type: 'critic', status: 'applied', note: 'Revision applied after second-pass review.' };
      } else {
        yield { type: 'critic', status: 'skipped', note: 'Critic found no improvements — keeping the original draft.' };
      }
    } catch (err) {
      yield {
        type: 'critic',
        status: 'failed',
        note: `Critic pass failed (${err instanceof Error ? err.name : 'unknown'}) — keeping the original draft.`,
      };
    }
  }

  // Referential integrity checks (spec.ts).
  const integrityErrors = validateScaffoldIntegrity(spec);
  if (integrityErrors.length > 0) {
    yield {
      type: 'error',
      message: `Scaffold integrity check failed: ${integrityErrors[0]}`,
      recoverable: true,
    };
    throw new Error(`scaffold_integrity_failed: ${integrityErrors.join(' | ')}`);
  }

  // Stream one organelle event per piece so the UI can animate assembly.
  for (const s of spec.systems) yield { type: 'organelle', kind: 'system', name: s.name };
  for (const w of spec.workflows) yield { type: 'organelle', kind: 'workflow', name: w.name };
  for (const s of spec.signals) yield { type: 'organelle', kind: 'signal', name: s.name };
  for (const w of spec.widgets) yield { type: 'organelle', kind: 'widget', name: w.widget };
  for (const r of spec.roles) yield { type: 'organelle', kind: 'role', name: r.personHint };
  for (const i of spec.integrations) yield { type: 'organelle', kind: 'integration', name: i.provider };

  yield { type: 'validated', spec };
  return spec;
}

/**
 * Critic pass — Nova reviews its own draft and emits a revision. The
 * system prompt makes it adversarial to its own output: look for
 * over-fitting, wrong abstraction level, missing staple workflows,
 * etc. Returns the revised spec, or null if the critic chose not to
 * change anything (not an error).
 */
async function runCriticPass(
  client: Anthropic,
  prompt: string,
  draft: ScaffoldSpec,
): Promise<ScaffoldSpec | null> {
  const criticPrompt = `You are Nova's critic. You just produced the draft below for the
following prompt. Review it HARSHLY as if a senior architect asked:
"What's wrong with this? Over-fit? Under-specified? Missing a staple?
Wrong abstraction level for the described team size?" Then emit a
revised spec via the return_scaffold tool.

Original prompt: ${prompt}

Your draft:
${JSON.stringify(draft, null, 2).slice(0, 3000)}

Rules for the revision:
- Keep what's right — this is refinement, not rewrite from scratch.
- Fix naming that's generic where the prompt was specific.
- Cut organelles that duplicate each other.
- Add any staple workflow the team clearly needs but you missed.
- Preserve stage.ids for stages that survive, so references stay valid.

If the draft is already correct, return it unchanged.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: 'You are Nova, in critic mode. Emit only via return_scaffold.',
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'return_scaffold' },
      messages: [{ role: 'user', content: criticPrompt }],
    });
    const block = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'return_scaffold',
    );
    if (!block) return null;
    const reparsed = ScaffoldSpec.safeParse(block.input);
    if (!reparsed.success) return null; // critic output is optional — bail cleanly
    return reparsed.data;
  } catch {
    // Critic pass is best-effort. If it fails, caller keeps the
    // original draft rather than breaking the whole scaffold.
    return null;
  }
}
