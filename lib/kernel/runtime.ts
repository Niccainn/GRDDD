/**
 * Nova Kernel — Runtime
 *
 * The agentic loop. Given a KernelRequest, this:
 *
 *   1. Opens a Trace
 *   2. Routes to a model via router.ts
 *   3. Calls Anthropic with the chosen model + tools
 *   4. Streams events into the trace
 *   5. Handles tool_use blocks by invoking the tool registry
 *   6. Loops until stop_reason !== 'tool_use' or max iterations reached
 *   7. Persists the trace and returns the KernelResponse
 *
 * The runtime exposes TWO entry points:
 *
 *   run(req)    — awaitable, returns full KernelResponse
 *   stream(req) — async iterator of TraceEvent for live UIs
 *
 * Internally, run() is just stream() drained to completion. This means
 * there is ONE agentic loop implementation, not two.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  KernelRequest,
  KernelResponse,
  TraceEvent,
  KernelMessage,
} from './types';
import { Trace } from './trace';
import { route, computeCostUsd } from './router';
import { invokeTool, toAnthropicTools } from './tools/registry';
import { checkBudget, recordSpend, BudgetError } from './budget';
import { getAnthropicClientForEnvironment, MissingKeyError } from '@/lib/nova/client-factory';

const DEFAULT_MAX_ITERATIONS = 8;

/**
 * Resolve the Anthropic client for this kernel invocation. Per-tenant
 * BYOK: if the context has an environmentId we go through the factory
 * which picks the tenant's key. Only fall back to the platform key
 * when there is no tenant scope (dev scripts, admin-only tasks).
 *
 * This is the fix for the BYOK bypass that previously instantiated a
 * module-level singleton on process.env.ANTHROPIC_API_KEY — which
 * meant every workflow execution billed the platform regardless of
 * tier. Now every call resolves at invocation time.
 */
async function resolveClient(envId?: string): Promise<Anthropic> {
  if (envId) {
    const resolved = await getAnthropicClientForEnvironment(envId);
    return resolved.client;
  }
  // No environment scope. Only the platform can make un-scoped calls
  // (backfill scripts, health checks). Throw MissingKey if ANTHROPIC_API_KEY
  // is missing so we fail loudly in production rather than silently 500ing.
  const platformKey = process.env.ANTHROPIC_API_KEY;
  if (!platformKey) {
    throw new MissingKeyError(
      'No environment scope on this kernel call and no platform ANTHROPIC_API_KEY configured.',
    );
  }
  return new Anthropic({ apiKey: platformKey });
}

/**
 * Streaming entry point. Yields TraceEvents as they happen.
 */
export async function* stream(req: KernelRequest): AsyncGenerator<TraceEvent, KernelResponse, void> {
  const trace = new Trace(req.context);
  const startedAt = Date.now();

  // ─── Routing ───────────────────────────────────────────────────────────
  const lastUser = req.messages.filter((m) => m.role === 'user').slice(-1)[0];
  const decision = route({
    preferredTier: req.tier,
    toolCount: req.tools?.length ?? 0,
    userMessageChars: lastUser?.content.length ?? 0,
    systemPromptHint: req.systemPrompt,
  });
  trace.setRouting(decision.tier, decision.model);

  const startEvt: TraceEvent = {
    type: 'start',
    traceId: trace.traceId,
    tier: decision.tier,
    model: decision.model,
    timestamp: Date.now(),
  };
  trace.emit(startEvt);
  yield startEvt;

  // ─── Build anthropic messages ──────────────────────────────────────────
  const messages: Anthropic.MessageParam[] = req.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const anthropicTools = req.tools?.length ? toAnthropicTools(req.tools) : undefined;
  const maxTokens = req.maxTokens ?? decision.profile.defaultMaxTokens;
  const maxIter = req.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  let totalIn = 0;
  let totalOut = 0;
  let toolCalls = 0;
  let finalText = '';
  let iter = 0;

  // Resolve BYOK client ONCE per invocation (key rotation mid-loop
  // would invalidate in-flight messages anyway). Routes the Anthropic
  // call to the tenant's own key if they have one — this is the guard
  // against the previous BYOK bypass where workflow stages billed the
  // platform key regardless of tier.
  const client = await resolveClient(req.context.environmentId);

  try {
    while (iter < maxIter) {
      iter += 1;

      // Budget circuit breaker: refuse to call Anthropic if this
      // tenant has already burned through today's cap. Checked every
      // iteration, not just the first, because a long tool loop can
      // cross the threshold mid-run.
      const budget = checkBudget(req.context.tenantId);
      if (!budget.allowed) {
        throw new BudgetError(budget);
      }

      const thinkEvt: TraceEvent = { type: 'thinking', timestamp: Date.now() };
      trace.emit(thinkEvt);
      yield thinkEvt;

      const response = await client.messages.create({
        model: decision.model,
        max_tokens: maxTokens,
        system: req.systemPrompt,
        messages,
        tools: anthropicTools,
      });

      totalIn += response.usage.input_tokens;
      totalOut += response.usage.output_tokens;

      // Bill the spend to the tenant's daily bucket immediately so
      // the next iteration sees it and a parallel request from the
      // same tenant can't slip under the cap.
      const iterCostUsd = computeCostUsd(decision.tier, {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      });
      recordSpend(req.context.tenantId, iterCostUsd);

      // Walk the content blocks in order.
      const toolUses: Anthropic.ToolUseBlock[] = [];
      for (const block of response.content) {
        if (block.type === 'text') {
          finalText += (finalText ? '\n\n' : '') + block.text;
          const evt: TraceEvent = {
            type: 'text_delta',
            text: block.text,
            timestamp: Date.now(),
          };
          trace.emit(evt);
          yield evt;
        } else if (block.type === 'tool_use') {
          toolUses.push(block);
          const evt: TraceEvent = {
            type: 'tool_call',
            toolName: block.name,
            args: block.input,
            callId: block.id,
            timestamp: Date.now(),
          };
          trace.emit(evt);
          yield evt;
        }
      }

      // If the model stopped for a non-tool reason we're done.
      if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
        break;
      }

      // Record the assistant turn (with tool_use blocks) into history.
      messages.push({ role: 'assistant', content: response.content });

      // Execute each tool and build the tool_result turn.
      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        toolCalls += 1;
        const { result, durationMs } = await invokeTool(use.name, use.input, req.context);
        const evt: TraceEvent = {
          type: 'tool_result',
          callId: use.id,
          ok: result.ok,
          summary: result.summary,
          durationMs,
          timestamp: Date.now(),
        };
        trace.emit(evt);
        yield evt;

        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: use.id,
          is_error: !result.ok,
          content: JSON.stringify(result.data ?? { summary: result.summary, error: result.error }),
        });
      }

      messages.push({ role: 'user', content: toolResultBlocks });
    }

    const costUsd = computeCostUsd(decision.tier, { input: totalIn, output: totalOut });
    const kernelResponse: KernelResponse = {
      text: finalText.trim(),
      traceId: trace.traceId,
      tokens: { input: totalIn, output: totalOut, total: totalIn + totalOut },
      costUsd,
      modelUsed: decision.model,
      toolCalls,
      durationMs: Date.now() - startedAt,
    };

    trace.complete(kernelResponse);
    yield { type: 'done', response: kernelResponse, timestamp: Date.now() };
    await trace.persist();
    return kernelResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    trace.fail(msg);
    yield { type: 'error', message: msg, recoverable: false, timestamp: Date.now() };
    await trace.persist();
    throw err;
  }
}

/**
 * Non-streaming entry point. Drains the stream to completion.
 */
export async function run(req: KernelRequest): Promise<KernelResponse> {
  const iter = stream(req);
  let final: KernelResponse | undefined;
  while (true) {
    const { value, done } = await iter.next();
    if (done) {
      final = value;
      break;
    }
    if (value.type === 'done') {
      final = value.response;
    }
  }
  if (!final) throw new Error('Kernel stream ended without a response');
  return final;
}
