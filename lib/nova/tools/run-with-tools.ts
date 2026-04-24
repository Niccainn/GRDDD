/**
 * runClaudeWithTools — the Nova execution engine's tool-use loop.
 *
 * Drop-in replacement for `anthropic.messages.stream(...).finalMessage()`
 * that also handles Claude's `tool_use` / `tool_result` cycle. Streams
 * text to the caller via `onText`, invokes tools against GRID's
 * adapters via the dispatcher, and returns the collected invocations
 * alongside the final text.
 *
 * Why this exists: the runner used to call Claude once per stage and
 * discard anything that wasn't text. That meant workflows saying
 * "Post to Slack" produced a lovely paragraph about posting — and
 * zero actual Slack traffic. With this helper, when Claude emits
 * `tool_use` we execute, feed the result back, and keep going.
 */

import Anthropic from '@anthropic-ai/sdk';
import { toolSchemasForClaude } from './registry';
import { dispatchTool, type ToolInvocation } from './dispatch';
import type { ToolContext } from './registry';

type Message = Anthropic.Messages.MessageParam;

type RunOpts = {
  client: Anthropic;
  model: string;
  maxTokens: number;
  system: string;
  messages: Message[];
  ctx: ToolContext;
  live: boolean;
  maxIterations?: number;
  onText?: (text: string) => void;
};

export type RunResult = {
  text: string;
  invocations: ToolInvocation[];
  usage: { input_tokens: number; output_tokens: number };
  stopReason: string | null;
  iterations: number;
};

export async function runClaudeWithTools(opts: RunOpts): Promise<RunResult> {
  const {
    client, model, maxTokens, system, ctx, live,
    onText,
  } = opts;
  const maxIterations = opts.maxIterations ?? 5;
  const messages: Message[] = [...opts.messages];
  const invocations: ToolInvocation[] = [];
  let totalInput = 0;
  let totalOutput = 0;
  let finalText = '';
  let stopReason: string | null = null;
  let iterations = 0;

  const tools = toolSchemasForClaude();

  while (iterations < maxIterations) {
    iterations += 1;

    const stream = client.messages.stream({
      model,
      max_tokens: maxTokens,
      system,
      tools: tools.length > 0 ? tools : undefined,
      messages,
    });

    let iterText = '';
    if (onText) stream.on('text', t => { iterText += t; onText(t); });

    const final = await stream.finalMessage();
    totalInput += final.usage.input_tokens;
    totalOutput += final.usage.output_tokens;
    stopReason = final.stop_reason ?? null;

    // Collect any pure-text blocks into the running output.
    const textBlocks = final.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');
    if (textBlocks) finalText += (finalText ? '\n\n' : '') + textBlocks;
    else if (iterText) finalText += (finalText ? '\n\n' : '') + iterText;

    if (final.stop_reason !== 'tool_use') break;

    const toolUses = final.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use',
    );
    if (toolUses.length === 0) break;

    // Append assistant turn verbatim (required by the API when feeding tool_result back).
    messages.push({ role: 'assistant', content: final.content });

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      const input = (use.input ?? {}) as Record<string, unknown>;
      const inv = await dispatchTool(use.name, input, ctx, { live });
      invocations.push(inv);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: use.id,
        content: JSON.stringify(inv.result).slice(0, 50_000),
        is_error: Boolean(inv.error),
      });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  return {
    text: finalText,
    invocations,
    usage: { input_tokens: totalInput, output_tokens: totalOutput },
    stopReason,
    iterations,
  };
}
