/**
 * Agent runner — the execution path for the "prompt-as-agent" primitive.
 *
 * One call to `executeAgentRun(agentId, inputs, identityId)`:
 *   1. Loads the agent + its environment
 *   2. Checks budget
 *   3. Resolves an Anthropic client via the BYOK factory (tenant key
 *      or platform fallback depending on tier)
 *   4. Substitutes {{var}} tokens in the prompt template
 *   5. Creates an AgentRun row (status RUNNING)
 *   6. Calls Anthropic (non-streaming for v1)
 *   7. Parses the response into structured AgentOutputBlocks
 *   8. Stamps success/failure + tokens/cost
 *   9. Updates agent.lastRunAt
 *
 * This path is intentionally simpler than runNovaAgent: no tool use,
 * no streaming, no multi-turn. An Agent is a prompt with structured
 * output — that's the whole primitive. Tool use comes in v2 when users
 * can attach MCP servers or GRID-native integrations to an Agent.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import {
  getAnthropicClientForEnvironment,
  MissingKeyError,
} from '@/lib/nova/client-factory';
import { calculateCost, checkBudget, recordTokenUsage } from '@/lib/cost';
import { audit } from '@/lib/audit';
import { selectAvailableTools, TOOLS } from '@/lib/integrations/tools';
import { notifyApprovalNeeded } from '@/lib/agents/notify';
import {
  runToolLoop,
  resumeConversation,
  type ConversationState,
  type LoopResult,
  type PendingActionDraft,
  type ToolCallTraceEntry,
} from '@/lib/agents/run-loop';

export type InputValue = string | number | boolean;

export type AgentRunInputs = Record<string, InputValue>;

export class AgentRunError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AgentRunError';
  }
}

/**
 * Substitute {{name}} tokens in the prompt template from the inputs
 * map. Unknown tokens are left as-is (visible to the model) rather
 * than throwing — this lets users write templates with optional
 * variables and Nova will handle them gracefully in context.
 */
export function substitutePrompt(template: string, inputs: AgentRunInputs): string {
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, name) => {
    if (name in inputs) {
      return String(inputs[name]);
    }
    return match;
  });
}

// ─── Block parsing ──────────────────────────────────────────────────────────
//
// We ask the model to emit structured output in a lightweight token
// format rather than free-form JSON or hard-coded tool calls. The
// format is forgiving: if the model just returns plain text we fall
// back to a single text block. If it uses the block markers, we split
// them cleanly into typed blocks the UI can render as real components.
//
// Block markers (each on their own line):
//
//   ::tldr:: One-line summary that renders as a hero line.
//   ::heading[1]:: My big heading
//   ::heading[2]:: A subheading
//   ::metric[label=CAC, value=$42, delta=+12%]::
//   ::table::
//   | col A | col B |
//   | ----- | ----- |
//   | 1     | 2     |
//   ::end::
//
// Anything between markers (or a run without any markers at all) is
// collected into a `text` block containing markdown. The renderer
// supports: text, tldr, heading, metric, table.

type ParsedBlock = {
  type: string;
  content: Record<string, unknown>;
};

/**
 * Parse `key=value` pairs inside a `[...]` marker argument list.
 *
 * Separator handling is intentionally lenient: a comma only ends a
 * value when it's followed by another `key=` token. This lets values
 * contain natural commas (`$1,240`) without forcing the model to quote
 * them. Quoted values (`"..."`) are also honored.
 *
 * Implemented via a single regex that walks the string and captures
 * either a quoted value or a lazy value terminated by a lookahead for
 * `, key=` or end-of-string.
 */
function parseArgs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:"([^"]*)"|([\s\S]*?))(?=\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*\s*=|\s*$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const key = m[1];
    const value = (m[2] ?? m[3] ?? '').trim();
    out[key] = value;
  }
  return out;
}

/**
 * Parse a pipe-delimited markdown table body into { headers, rows }.
 * The second line (divider `| --- | --- |`) is ignored if present.
 */
function parseTable(body: string): { headers: string[]; rows: string[][] } {
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'));
  if (lines.length === 0) return { headers: [], rows: [] };

  const splitRow = (line: string) =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());

  const headers = splitRow(lines[0]);
  const bodyLines = lines.slice(1).filter((l) => !/^\|\s*-+/.test(l));
  const rows = bodyLines.map(splitRow);
  return { headers, rows };
}

export function parseOutputBlocks(raw: string): ParsedBlock[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [{ type: 'text', content: { markdown: '' } }];
  }

  const blocks: ParsedBlock[] = [];
  const lines = trimmed.split('\n');

  // Accumulator for plain-text blocks (collected between markers).
  let textBuffer: string[] = [];
  const flushText = () => {
    const md = textBuffer.join('\n').trim();
    textBuffer = [];
    if (md) blocks.push({ type: 'text', content: { markdown: md } });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ::tldr:: rest of line
    const tldrMatch = line.match(/^::tldr::\s*(.*)$/i);
    if (tldrMatch) {
      flushText();
      blocks.push({ type: 'tldr', content: { text: tldrMatch[1].trim() } });
      continue;
    }

    // ::heading[N]:: text  (or ::heading:: text, default level 2)
    const headingMatch = line.match(/^::heading(?:\[(\d)\])?::\s*(.*)$/i);
    if (headingMatch) {
      flushText();
      const level = headingMatch[1] ? parseInt(headingMatch[1], 10) : 2;
      blocks.push({
        type: 'heading',
        content: { level, text: headingMatch[2].trim() },
      });
      continue;
    }

    // ::metric[label=..., value=..., delta=...]::
    const metricMatch = line.match(/^::metric(?:\[([^\]]*)\])?::\s*$/i);
    if (metricMatch) {
      flushText();
      const args = parseArgs(metricMatch[1] ?? '');
      blocks.push({
        type: 'metric',
        content: {
          label: args.label ?? '',
          value: args.value ?? '',
          delta: args.delta ?? '',
          hint: args.hint ?? '',
        },
      });
      continue;
    }

    // ::table:: ... ::end::
    if (/^::table::\s*$/i.test(line)) {
      flushText();
      const bodyLines: string[] = [];
      i++;
      while (i < lines.length && !/^::end::\s*$/i.test(lines[i])) {
        bodyLines.push(lines[i]);
        i++;
      }
      const { headers, rows } = parseTable(bodyLines.join('\n'));
      blocks.push({ type: 'table', content: { headers, rows } });
      continue;
    }

    textBuffer.push(line);
  }
  flushText();

  // Defensive: if parsing somehow ate everything, fall back to one text block.
  if (blocks.length === 0) {
    return [{ type: 'text', content: { markdown: trimmed } }];
  }
  return blocks;
}

// ─── Main execution ─────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MODEL_ID_MAP: Record<string, string> = {
  'claude-sonnet-4-6': 'claude-sonnet-4-5',
  'claude-haiku-4-5': 'claude-haiku-4-5',
  'claude-opus-4-6': 'claude-opus-4-5',
};

/**
 * Map our internal model aliases to the actual Anthropic model IDs.
 * We keep a stable alias in the DB so model renames/upgrades are a
 * one-line change here instead of a migration.
 */
function resolveModelId(alias: string): string {
  return MODEL_ID_MAP[alias] ?? 'claude-sonnet-4-5';
}

export async function executeAgentRun(params: {
  agentId: string;
  inputs: AgentRunInputs;
  identityId: string;
}): Promise<{ runId: string }> {
  const { agentId, inputs, identityId } = params;

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, deletedAt: null },
    include: { environment: { select: { id: true, name: true } } },
  });
  if (!agent) {
    throw new AgentRunError('Agent not found', 'not_found');
  }

  // Budget gate — same check Nova uses so agents and Nova share one
  // envelope. If budget is exceeded we never hit Anthropic at all.
  const budget = await checkBudget(agent.environmentId);
  if (!budget.allowed) {
    throw new AgentRunError(
      'Token budget exceeded for this environment',
      'budget_exceeded',
    );
  }

  // Resolve client (BYOK or platform fallback).
  let client: Anthropic;
  try {
    const resolved = await getAnthropicClientForEnvironment(agent.environmentId);
    client = resolved.client;
  } catch (err) {
    if (err instanceof MissingKeyError) {
      throw new AgentRunError(err.message, 'missing_key');
    }
    throw err;
  }

  // Substitute inputs into template.
  const resolvedPrompt = substitutePrompt(agent.promptTemplate, inputs);

  // Create RUNNING run row BEFORE the network call so partial failures
  // still leave an auditable record.
  const run = await prisma.agentRun.create({
    data: {
      agentId: agent.id,
      status: 'RUNNING',
      resolvedPrompt,
      inputs: Object.keys(inputs).length ? JSON.stringify(inputs) : null,
      startedAt: new Date(),
    },
  });

  const modelAlias = agent.model ?? DEFAULT_MODEL;
  const modelId = resolveModelId(modelAlias);

  // ── Tool selection ──────────────────────────────────────────────
  // Load every ACTIVE integration in the agent's environment and
  // translate them into Claude tool definitions. If nothing is
  // connected this returns an empty array and the code path below
  // is byte-for-byte identical to the pre-Phase-3 behavior.
  const integrations = await prisma.integration.findMany({
    where: {
      environmentId: agent.environmentId,
      status: 'ACTIVE',
      deletedAt: null,
    },
  });
  const { available, byName } = selectAvailableTools(integrations);
  const anthropicTools = available.map(a => a.anthropic);

  try {
    const conversation: Anthropic.MessageParam[] = [
      { role: 'user', content: resolvedPrompt },
    ];

    const result = await runToolLoop({
      client,
      modelId,
      conversation,
      byName,
      anthropicTools,
      priorIterations: 0,
    });

    await persistLoopResult({
      runId: run.id,
      agentId: agent.id,
      environmentId: agent.environmentId,
      modelAlias,
      result,
      agentName: agent.name,
      environmentName: agent.environment.name,
      creatorId: agent.creatorId,
    });

    void identityId;
    return { runId: run.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        error: message,
        completedAt: new Date(),
      },
    });
    throw new AgentRunError(message, 'execution_failed');
  }
}

// ─── Loop result persistence ───────────────────────────────────────
//
// Both the initial run path and the resume path funnel through this
// helper so the AgentRun row, blocks, pending-action drafts, and
// token accounting always end up in the same shape. The shape change
// vs. Phase 3: a `paused` LoopResult writes a status of
// AWAITING_APPROVAL + a JSON conversationState + an `action` block
// per draft + a PendingAction row per draft.

async function persistLoopResult(params: {
  runId: string;
  agentId: string;
  environmentId: string;
  modelAlias: string;
  result: LoopResult;
  agentName?: string;
  environmentName?: string;
  creatorId?: string;
}): Promise<void> {
  const { runId, agentId, environmentId, modelAlias, result } = params;
  const totalTokens = result.totalInputTokens + result.totalOutputTokens;
  const cost = calculateCost(modelAlias, result.totalInputTokens, result.totalOutputTokens);

  if (result.status === 'done') {
    const blocks = parseOutputBlocks(result.finalText);

    // Replace the run's existing output blocks with the latest set so
    // resume cycles don't accumulate stale action cards alongside the
    // final text. Pre-existing blocks are wiped before insert.
    await prisma.$transaction([
      prisma.agentOutputBlock.deleteMany({ where: { runId } }),
      prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: 'SUCCESS',
          outputText: result.finalText,
          tokens: totalTokens,
          cost,
          toolCalls: result.toolCallTrace.length > 0 ? JSON.stringify(result.toolCallTrace) : null,
          conversationState: null,
          iterationsUsed: result.iterationsUsed,
          completedAt: new Date(),
        },
      }),
      ...blocks.map((block, index) =>
        prisma.agentOutputBlock.create({
          data: {
            runId,
            index,
            type: block.type,
            content: JSON.stringify(block.content),
          },
        }),
      ),
      prisma.agent.update({
        where: { id: agentId },
        data: { lastRunAt: new Date() },
      }),
    ]);

    await recordTokenUsage(environmentId, totalTokens);
    return;
  }

  // ── paused ───────────────────────────────────────────────────────
  // Persist pending actions + emit one `action` AgentOutputBlock per
  // draft. The block carries the pending action id so the renderer
  // can wire approve/reject buttons without a second fetch.
  const createdActions = await prisma.$transaction(
    result.pendingDrafts.map((draft) =>
      prisma.pendingAction.create({
        data: {
          runId,
          toolUseId: draft.toolUseId,
          toolName: draft.toolName,
          toolInput: JSON.stringify(draft.toolInput),
          provider: draft.provider,
          integrationId: draft.integrationId,
          summary: draft.summary,
          status: 'PENDING',
        },
      }),
    ),
  );

  // Pair each created action with its draft so the block content can
  // include both the id (for the API) and the human-readable summary.
  const actionBlocks = createdActions.map((action, index) => {
    const draft = result.pendingDrafts[index];
    return {
      type: 'action' as const,
      content: {
        pendingActionId: action.id,
        toolName: draft.toolName,
        provider: draft.provider,
        summary: draft.summary,
        status: 'PENDING' as const,
      },
    };
  });

  await prisma.$transaction([
    prisma.agentOutputBlock.deleteMany({ where: { runId } }),
    prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: 'AWAITING_APPROVAL',
        tokens: totalTokens,
        cost,
        toolCalls: result.toolCallTrace.length > 0 ? JSON.stringify(result.toolCallTrace) : null,
        conversationState: JSON.stringify(result.conversationState),
        iterationsUsed: result.iterationsUsed,
      },
    }),
    ...actionBlocks.map((block, index) =>
      prisma.agentOutputBlock.create({
        data: {
          runId,
          index,
          type: block.type,
          content: JSON.stringify(block.content),
        },
      }),
    ),
  ]);

  await recordTokenUsage(environmentId, totalTokens);

  // Fire-and-forget: email the agent's creator so they know to
  // review. Runs after persistence so the data is durable even if
  // the notification fails.
  if (params.creatorId) {
    notifyApprovalNeeded({
      runId,
      agentId,
      agentName: params.agentName ?? 'Agent',
      environmentName: params.environmentName ?? 'Environment',
      summaries: result.pendingDrafts.map((d) => d.summary),
      creatorId: params.creatorId,
    });
  }
}

// ─── Resume after approvals ────────────────────────────────────────

/**
 * Resume an AWAITING_APPROVAL run after every PendingAction tied to
 * it has been decided. Approved actions get executed, rejected ones
 * become tool_results with is_error: true so Claude can recover. The
 * resulting tool_results are spliced back into the conversation
 * checkpoint and the loop re-enters from where it paused.
 */
export async function resumeAgentRun(params: {
  runId: string;
  identityId: string;
}): Promise<{ runId: string }> {
  const { runId } = params;

  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    include: {
      pendingActions: true,
      agent: {
        select: {
          id: true,
          name: true,
          model: true,
          environmentId: true,
          creatorId: true,
          environment: { select: { name: true } },
        },
      },
    },
  });
  if (!run) throw new AgentRunError('Run not found', 'not_found');
  if (run.status !== 'AWAITING_APPROVAL') {
    throw new AgentRunError(`Run is ${run.status} — cannot resume`, 'invalid_state');
  }
  if (!run.conversationState) {
    throw new AgentRunError('Run has no conversation checkpoint', 'invalid_state');
  }

  // Every pending action must be decided before we resume.
  const undecided = run.pendingActions.filter((a) => a.status === 'PENDING');
  if (undecided.length > 0) {
    throw new AgentRunError(
      `${undecided.length} pending action(s) still awaiting a decision`,
      'awaiting_approval',
    );
  }

  // Load the agent's environment integrations + tools so we can
  // execute the approved actions and re-enter the loop with the
  // same toolset Claude was reasoning over.
  const integrations = await prisma.integration.findMany({
    where: {
      environmentId: run.agent.environmentId,
      status: 'ACTIVE',
      deletedAt: null,
    },
  });
  const { available, byName } = selectAvailableTools(integrations);
  const anthropicTools = available.map((a) => a.anthropic);

  // Execute approved actions; build tool_results for both approved
  // and rejected so every tool_use_id from the paused turn gets a
  // matching reply (Anthropic requires this).
  const resolvedMutatingResults: Anthropic.ToolResultBlockParam[] = [];
  const resumeTrace: ToolCallTraceEntry[] = [];

  for (const action of run.pendingActions) {
    if (action.status === 'EXECUTED' || action.status === 'FAILED') {
      // Already executed in a prior resume attempt — reuse stored result.
      const content =
        action.status === 'EXECUTED'
          ? action.resultJson ?? '{}'
          : action.error ?? 'Tool execution failed';
      resolvedMutatingResults.push({
        type: 'tool_result',
        tool_use_id: action.toolUseId,
        content,
        is_error: action.status === 'FAILED',
      });
      continue;
    }

    if (action.status === 'REJECTED') {
      const message =
        action.decisionReason && action.decisionReason.trim().length > 0
          ? `User rejected this action: ${action.decisionReason}`
          : 'User rejected this action.';
      resolvedMutatingResults.push({
        type: 'tool_result',
        tool_use_id: action.toolUseId,
        content: message,
        is_error: true,
      });
      continue;
    }

    // APPROVED — actually execute the upstream call.
    const tool = TOOLS.find((t) => t.name === action.toolName);
    const integration = integrations.find((i) => i.id === action.integrationId);
    const started = Date.now();

    if (!tool || !integration) {
      const message = !tool
        ? `Tool no longer registered: ${action.toolName}`
        : `Integration no longer available: ${action.integrationId}`;
      await prisma.pendingAction.update({
        where: { id: action.id },
        data: { status: 'FAILED', error: message, executedAt: new Date() },
      });
      resumeTrace.push({
        tool: action.toolName,
        input: safeJsonParse(action.toolInput),
        error: message,
        durationMs: 0,
        integrationId: action.integrationId,
      });
      resolvedMutatingResults.push({
        type: 'tool_result',
        tool_use_id: action.toolUseId,
        content: message,
        is_error: true,
      });
      continue;
    }

    try {
      const args = safeJsonParse(action.toolInput) as Record<string, unknown>;
      const output = await tool.execute(integration, args);
      const resultJson = JSON.stringify(output);
      await prisma.pendingAction.update({
        where: { id: action.id },
        data: {
          status: 'EXECUTED',
          resultJson,
          executedAt: new Date(),
        },
      });
      audit({
        action: 'agent.action.executed',
        entity: 'pending_action',
        entityId: action.id,
        entityName: action.summary,
        actorId: action.decidedById ?? undefined,
        environmentId: run.agent.environmentId,
        metadata: {
          runId,
          provider: action.provider,
          toolName: action.toolName,
          integrationId: integration.id,
        },
      });
      resumeTrace.push({
        tool: action.toolName,
        input: args,
        output,
        durationMs: Date.now() - started,
        integrationId: integration.id,
      });
      resolvedMutatingResults.push({
        type: 'tool_result',
        tool_use_id: action.toolUseId,
        content: resultJson,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tool failed';
      await prisma.pendingAction.update({
        where: { id: action.id },
        data: {
          status: 'FAILED',
          error: message,
          executedAt: new Date(),
        },
      });
      audit({
        action: 'agent.action.failed',
        entity: 'pending_action',
        entityId: action.id,
        entityName: action.summary,
        actorId: action.decidedById ?? undefined,
        environmentId: run.agent.environmentId,
        metadata: {
          runId,
          provider: action.provider,
          toolName: action.toolName,
          integrationId: integration.id,
          error: message,
        },
      });
      resumeTrace.push({
        tool: action.toolName,
        input: safeJsonParse(action.toolInput),
        error: message,
        durationMs: Date.now() - started,
        integrationId: integration.id,
      });
      resolvedMutatingResults.push({
        type: 'tool_result',
        tool_use_id: action.toolUseId,
        content: message,
        is_error: true,
      });
    }
  }

  // Reassemble the conversation: prior committed history + the
  // paused assistant turn + a single user message with every
  // tool_result (reads from the paused turn AND the freshly-executed
  // mutates).
  const state = JSON.parse(run.conversationState) as ConversationState;
  const messages = resumeConversation(state, resolvedMutatingResults);

  // Re-resolve the Anthropic client + model id (these aren't carried
  // in the checkpoint — fewer secrets persisted, fewer staleness bugs).
  let client: Anthropic;
  try {
    const resolved = await getAnthropicClientForEnvironment(run.agent.environmentId);
    client = resolved.client;
  } catch (err) {
    if (err instanceof MissingKeyError) {
      throw new AgentRunError(err.message, 'missing_key');
    }
    throw err;
  }

  const modelAlias = run.agent.model ?? DEFAULT_MODEL;
  const modelId = resolveModelId(modelAlias);

  // Mark RUNNING again so the UI shows progress while we re-enter.
  await prisma.agentRun.update({
    where: { id: runId },
    data: { status: 'RUNNING' },
  });

  try {
    const result = await runToolLoop({
      client,
      modelId,
      conversation: messages,
      byName,
      anthropicTools,
      priorIterations: run.iterationsUsed,
    });

    // Merge the resume trace into the loop's trace so the run's
    // toolCalls field reflects every upstream call across all cycles.
    const mergedResult: LoopResult = {
      ...result,
      toolCallTrace: [...readPriorToolCalls(run.toolCalls), ...resumeTrace, ...result.toolCallTrace],
    };

    await persistLoopResult({
      runId,
      agentId: run.agent.id,
      environmentId: run.agent.environmentId,
      modelAlias,
      result: mergedResult,
      agentName: run.agent.name,
      environmentName: run.agent.environment.name,
      creatorId: run.agent.creatorId,
    });

    return { runId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await prisma.agentRun.update({
      where: { id: runId },
      data: { status: 'FAILED', error: message, completedAt: new Date() },
    });
    throw new AgentRunError(message, 'execution_failed');
  }
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function readPriorToolCalls(raw: string | null): ToolCallTraceEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ToolCallTraceEntry[]) : [];
  } catch {
    return [];
  }
}

// Re-export the draft type so the API layer can reference it.
export type { PendingActionDraft };
