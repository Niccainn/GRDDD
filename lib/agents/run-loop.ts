/**
 * Agent tool-use loop — Phase 5.
 *
 * The loop drives a multi-turn conversation with Claude where each
 * turn may include tool_use blocks. Read tools execute inline; write
 * tools (`mutating: true`) are queued as PendingAction rows and the
 * loop returns a `paused` result so the caller can persist the
 * conversation checkpoint and wait for human approval.
 *
 * The same function is used both by the initial run path and the
 * resume path. Resume passes a pre-populated `conversation` and a
 * `priorIterations` count so the iteration cap survives across
 * approval cycles.
 *
 * Conversation state envelope (persisted on AgentRun.conversationState
 * as JSON):
 *
 *   {
 *     messages: MessageParam[],          // committed turns
 *     pendingTurn?: {                    // assistant turn awaiting approvals
 *       assistant: ContentBlockParam[],  // raw assistant content (with tool_uses)
 *       resolvedReadResults: {           // read tool_results we already executed
 *         tool_use_id: string;
 *         content: string;
 *         is_error?: boolean;
 *       }[]
 *     }
 *   }
 *
 * Why split `pendingTurn` from `messages`: Anthropic requires every
 * tool_use in an assistant message to be paired with a tool_result in
 * the next user message. We can't commit a half-resolved turn to the
 * canonical history because that would violate the API contract on
 * the next call. Instead we hold the assistant response + the read
 * results in a side slot until every PendingAction is decided, then
 * splice everything into `messages` in one shot.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { TOOLS, type AgentTool } from '@/lib/integrations/tools';
import type { Integration } from '@prisma/client';

export const MAX_TOOL_ITERATIONS = 10;

export type ConversationState = {
  messages: Anthropic.MessageParam[];
  pendingTurn?: {
    assistant: Anthropic.ContentBlock[];
    resolvedReadResults: Anthropic.ToolResultBlockParam[];
  };
};

export type ToolCallTraceEntry = {
  tool: string;
  input: unknown;
  output?: unknown;
  error?: string;
  durationMs: number;
  integrationId: string;
};

export type ToolEntry = {
  tool: AgentTool;
  /** Primary (first) candidate — used when only one account is connected. */
  integration: Integration;
  /** All ACTIVE integrations matching this tool's provider. */
  candidates: Integration[];
  anthropic: { name: string; description: string; input_schema: AgentTool['inputSchema'] };
};

/**
 * Resolve which Integration a tool_use should run against. With one
 * candidate the answer is trivial. With multiple, the model must have
 * supplied an `integration_id` matching one of the entry's candidates;
 * we strip that arg before forwarding so individual tools don't have
 * to know about the multi-account dance.
 */
function resolveToolTarget(
  entry: ToolEntry,
  rawArgs: Record<string, unknown>,
): { integration: Integration; cleanArgs: Record<string, unknown> } {
  if (entry.candidates.length <= 1) {
    return { integration: entry.integration, cleanArgs: rawArgs };
  }
  const requested = rawArgs.integration_id;
  if (typeof requested !== 'string' || requested.length === 0) {
    throw new Error(
      `Tool ${entry.tool.name}: integration_id is required because multiple ${entry.tool.provider} accounts are connected`,
    );
  }
  const match = entry.candidates.find((c) => c.id === requested);
  if (!match) {
    throw new Error(
      `Tool ${entry.tool.name}: integration_id "${requested}" does not match any connected ${entry.tool.provider} account`,
    );
  }
  // Strip integration_id so the underlying tool sees a clean payload.
  const cleanArgs: Record<string, unknown> = { ...rawArgs };
  delete cleanArgs.integration_id;
  return { integration: match, cleanArgs };
}

export type PendingActionDraft = {
  toolUseId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  provider: string;
  integrationId: string;
  summary: string;
};

export type LoopResult =
  | {
      status: 'done';
      finalText: string;
      conversation: Anthropic.MessageParam[];
      iterationsUsed: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      toolCallTrace: ToolCallTraceEntry[];
    }
  | {
      status: 'paused';
      conversationState: ConversationState;
      iterationsUsed: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      toolCallTrace: ToolCallTraceEntry[];
      pendingDrafts: PendingActionDraft[];
    };

/**
 * Default summary text when a tool doesn't supply its own summarizer.
 * Keeps the approval card readable even for newly-added tools.
 */
function defaultSummary(toolName: string, args: Record<string, unknown>): string {
  try {
    return `${toolName}(${JSON.stringify(args)})`;
  } catch {
    return toolName;
  }
}

/** Look up a tool entry by name from the byName map. */
function lookupTool(byName: Map<string, ToolEntry>, name: string): ToolEntry | undefined {
  return byName.get(name);
}

/**
 * Streaming event emitter. When provided, the loop fires events at key
 * moments so callers (SSE routes) can push them to clients in real time.
 * The loop works identically whether or not the callback is present.
 */
export type LoopEvent =
  | { type: 'iteration:start'; iteration: number; maxIterations: number }
  | { type: 'tool:calling'; toolName: string; input: unknown }
  | { type: 'tool:result'; toolName: string; durationMs: number; error?: string }
  | { type: 'action:pending'; toolName: string; summary: string }
  | { type: 'text:done'; preview: string };

/**
 * Run the tool-use loop. Reads execute inline; writes pause via
 * PendingActionDraft. The caller is responsible for persisting the
 * pause + creating PendingAction rows in Prisma.
 */
export async function runToolLoop(params: {
  client: Anthropic;
  modelId: string;
  conversation: Anthropic.MessageParam[];
  byName: Map<string, ToolEntry>;
  anthropicTools: { name: string; description: string; input_schema: AgentTool['inputSchema'] }[];
  priorIterations: number;
  onEvent?: (event: LoopEvent) => void;
}): Promise<LoopResult> {
  const { client, modelId, byName, anthropicTools, priorIterations, onEvent } = params;
  const emit = onEvent ?? (() => {});
  const conversation = [...params.conversation];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const toolCallTrace: ToolCallTraceEntry[] = [];

  let finalText = '';
  let iter = priorIterations;
  while (iter < MAX_TOOL_ITERATIONS) {
    iter += 1;
    emit({ type: 'iteration:start', iteration: iter, maxIterations: MAX_TOOL_ITERATIONS });
    const response = await client.messages.create({
      model: modelId,
      max_tokens: 4096,
      messages: conversation,
      ...(anthropicTools.length > 0 ? { tools: anthropicTools } : {}),
    });
    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    if (response.stop_reason !== 'tool_use') {
      finalText = response.content
        .filter((c): c is Anthropic.TextBlock => c.type === 'text')
        .map(c => c.text)
        .join('\n\n');
      emit({ type: 'text:done', preview: finalText.slice(0, 200) });
      // Commit the final assistant message before returning.
      conversation.push({ role: 'assistant', content: response.content });
      return {
        status: 'done',
        finalText,
        conversation,
        iterationsUsed: iter,
        totalInputTokens,
        totalOutputTokens,
        toolCallTrace,
      };
    }

    // Inspect each tool_use block: queue mutates, run reads inline.
    const toolUses = response.content.filter(
      (c): c is Anthropic.ToolUseBlock => c.type === 'tool_use',
    );

    const resolvedReadResults: Anthropic.ToolResultBlockParam[] = [];
    const pendingDrafts: PendingActionDraft[] = [];

    for (const use of toolUses) {
      const entry = lookupTool(byName, use.name);
      if (!entry) {
        const msg = `Unknown tool: ${use.name}`;
        toolCallTrace.push({
          tool: use.name,
          input: use.input,
          error: msg,
          durationMs: 0,
          integrationId: '',
        });
        resolvedReadResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: msg,
          is_error: true,
        });
        continue;
      }

      // Resolve multi-account: extract integration_id when present
      // and pick the matching candidate. Clean args are forwarded to
      // the tool so individual execute() impls stay account-agnostic.
      let target: { integration: Integration; cleanArgs: Record<string, unknown> };
      try {
        target = resolveToolTarget(entry, (use.input ?? {}) as Record<string, unknown>);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'integration_id resolution failed';
        toolCallTrace.push({
          tool: use.name,
          input: use.input,
          error: message,
          durationMs: 0,
          integrationId: entry.integration.id,
        });
        resolvedReadResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: message,
          is_error: true,
        });
        continue;
      }

      emit({ type: 'tool:calling', toolName: use.name, input: target.cleanArgs });

      if (entry.tool.mutating) {
        const summary = entry.tool.summarize
          ? entry.tool.summarize(target.cleanArgs, target.integration)
          : defaultSummary(use.name, target.cleanArgs);
        emit({ type: 'action:pending', toolName: use.name, summary });
        pendingDrafts.push({
          toolUseId: use.id,
          toolName: use.name,
          toolInput: target.cleanArgs,
          provider: entry.tool.provider,
          integrationId: target.integration.id,
          summary,
        });
        continue;
      }

      // Read tool — execute inline.
      const started = Date.now();
      try {
        const output = await entry.tool.execute(target.integration, target.cleanArgs);
        const elapsed = Date.now() - started;
        emit({ type: 'tool:result', toolName: use.name, durationMs: elapsed });
        toolCallTrace.push({
          tool: use.name,
          input: use.input,
          output,
          durationMs: elapsed,
          integrationId: target.integration.id,
        });
        resolvedReadResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: JSON.stringify(output),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Tool failed';
        const elapsed = Date.now() - started;
        emit({ type: 'tool:result', toolName: use.name, durationMs: elapsed, error: message });
        toolCallTrace.push({
          tool: use.name,
          input: use.input,
          error: message,
          durationMs: elapsed,
          integrationId: target.integration.id,
        });
        resolvedReadResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: message,
          is_error: true,
        });
      }
    }

    if (pendingDrafts.length > 0) {
      // Pause: hand the caller everything it needs to persist a
      // checkpoint and create PendingAction rows.
      return {
        status: 'paused',
        conversationState: {
          messages: conversation,
          pendingTurn: {
            assistant: response.content,
            resolvedReadResults,
          },
        },
        iterationsUsed: iter,
        totalInputTokens,
        totalOutputTokens,
        toolCallTrace,
        pendingDrafts,
      };
    }

    // Pure-read turn — commit the assistant message + the user
    // tool_results, continue the loop.
    conversation.push({ role: 'assistant', content: response.content });
    conversation.push({ role: 'user', content: resolvedReadResults });
  }

  // Iteration cap exhausted.
  return {
    status: 'done',
    finalText: finalText || '(Tool-use loop exceeded max iterations — partial results only)',
    conversation,
    iterationsUsed: iter,
    totalInputTokens,
    totalOutputTokens,
    toolCallTrace,
  };
}

/**
 * Reassemble a paused conversation into a fresh `messages` list ready
 * for the next call to runToolLoop. Combines the prior committed
 * history with the in-flight assistant turn + the resolved read
 * results AND the freshly-decided mutating tool_results into a single
 * user message.
 */
export function resumeConversation(
  state: ConversationState,
  resolvedMutatingResults: Anthropic.ToolResultBlockParam[],
): Anthropic.MessageParam[] {
  const messages = [...state.messages];
  if (!state.pendingTurn) return messages;

  messages.push({ role: 'assistant', content: state.pendingTurn.assistant });

  // Order doesn't matter to Anthropic so long as every tool_use_id
  // appears exactly once. We concatenate reads first, then writes.
  const allResults: Anthropic.ToolResultBlockParam[] = [
    ...state.pendingTurn.resolvedReadResults,
    ...resolvedMutatingResults,
  ];
  messages.push({ role: 'user', content: allResults });
  return messages;
}

/** Re-export TOOLS for callers that need the raw registry. */
export { TOOLS };
