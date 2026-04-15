/**
 * POST /api/agents/[id]/run/stream — streaming agent run via SSE.
 *
 * Same auth + setup as POST /run, but returns a text/event-stream
 * response that pushes events as the tool-use loop progresses:
 *
 *   event: run:created       data: { runId }
 *   event: iteration:start   data: { iteration, maxIterations }
 *   event: tool:calling      data: { toolName, input }
 *   event: tool:result       data: { toolName, durationMs, error? }
 *   event: action:pending    data: { toolName, summary }
 *   event: text:done         data: { preview }
 *   event: run:done          data: { id, status, blocks, tokens, cost }
 *   event: run:error         data: { error, code? }
 *
 * The client opens this as `new EventSource()` or `fetch()` with a
 * ReadableStream reader. On `run:done` the stream closes naturally.
 */

import { NextRequest } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { getAuthIdentity } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rateLimitAgentRun } from '@/lib/rate-limit';
import {
  getAnthropicClientForEnvironment,
  MissingKeyError,
} from '@/lib/nova/client-factory';
import { checkBudget } from '@/lib/cost';
import { selectAvailableTools } from '@/lib/integrations/tools';
import { substitutePrompt, parseOutputBlocks, AgentRunError } from '@/lib/agents/run';
import { runToolLoop, type LoopEvent } from '@/lib/agents/run-loop';

// Persist the loop result in the same shape as the sync path.
// We re-use the persistence helper from run.ts via a dynamic import
// to avoid circular deps — but it's simpler to just inline the
// critical writes here since the SSE route needs to emit events
// between persistence steps anyway.
import { calculateCost, recordTokenUsage } from '@/lib/cost';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MODEL_ID_MAP: Record<string, string> = {
  'claude-sonnet-4-6': 'claude-sonnet-4-5',
  'claude-haiku-4-5': 'claude-haiku-4-5',
  'claude-opus-4-6': 'claude-opus-4-5',
};
function resolveModelId(alias: string): string {
  return MODEL_ID_MAP[alias] ?? 'claude-sonnet-4-5';
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  const rl = rateLimitAgentRun(identity.id);
  if (!rl.allowed) {
    return Response.json(
      { error: 'Too many agent runs — slow down', code: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  const agent = await prisma.agent.findFirst({
    where: {
      id,
      deletedAt: null,
      status: 'ACTIVE',
      environment: {
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
    },
    include: { environment: { select: { id: true } } },
  });
  if (!agent) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const budget = await checkBudget(agent.environmentId);
  if (!budget.allowed) {
    return Response.json({ error: 'Token budget exceeded', code: 'budget_exceeded' }, { status: 402 });
  }

  let client: Anthropic;
  try {
    const resolved = await getAnthropicClientForEnvironment(agent.environmentId);
    client = resolved.client;
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return Response.json({ error: err.message, code: 'missing_key' }, { status: 402 });
    }
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const inputs = body.inputs && typeof body.inputs === 'object' ? body.inputs : {};
  const resolvedPrompt = substitutePrompt(agent.promptTemplate, inputs);

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

  const integrations = await prisma.integration.findMany({
    where: { environmentId: agent.environmentId, status: 'ACTIVE', deletedAt: null },
  });
  const { available, byName } = selectAvailableTools(integrations);
  const anthropicTools = available.map(a => a.anthropic);

  // Set up SSE stream.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream closed by client — swallow.
        }
      }

      send('run:created', { runId: run.id });

      const conversation: Anthropic.MessageParam[] = [
        { role: 'user', content: resolvedPrompt },
      ];

      try {
        const result = await runToolLoop({
          client,
          modelId,
          conversation,
          byName,
          anthropicTools,
          priorIterations: 0,
          onEvent(evt: LoopEvent) {
            send(evt.type, evt);
          },
        });

        // Persist result.
        const totalTokens = result.totalInputTokens + result.totalOutputTokens;
        const cost = calculateCost(modelAlias, result.totalInputTokens, result.totalOutputTokens);

        if (result.status === 'done') {
          const blocks = parseOutputBlocks(result.finalText);
          await prisma.$transaction([
            prisma.agentOutputBlock.deleteMany({ where: { runId: run.id } }),
            prisma.agentRun.update({
              where: { id: run.id },
              data: {
                status: 'SUCCESS',
                outputText: result.finalText,
                tokens: totalTokens,
                cost,
                toolCalls: result.toolCallTrace.length > 0 ? JSON.stringify(result.toolCallTrace) : null,
                iterationsUsed: result.iterationsUsed,
                completedAt: new Date(),
              },
            }),
            ...blocks.map((block, index) =>
              prisma.agentOutputBlock.create({
                data: { runId: run.id, index, type: block.type, content: JSON.stringify(block.content) },
              }),
            ),
            prisma.agent.update({ where: { id: agent.id }, data: { lastRunAt: new Date() } }),
          ]);
          await recordTokenUsage(agent.environmentId, totalTokens);

          send('run:done', {
            id: run.id,
            status: 'SUCCESS',
            tokens: totalTokens,
            cost,
            blocks: blocks.map((b, i) => ({ index: i, type: b.type, content: b.content })),
          });
        } else {
          // Paused — create pending actions.
          const createdActions = await prisma.$transaction(
            result.pendingDrafts.map(draft =>
              prisma.pendingAction.create({
                data: {
                  runId: run.id,
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

          const actionBlocks = createdActions.map((action, i) => ({
            type: 'action' as const,
            content: {
              pendingActionId: action.id,
              toolName: result.pendingDrafts[i].toolName,
              provider: result.pendingDrafts[i].provider,
              summary: result.pendingDrafts[i].summary,
              status: 'PENDING',
            },
          }));

          await prisma.$transaction([
            prisma.agentOutputBlock.deleteMany({ where: { runId: run.id } }),
            prisma.agentRun.update({
              where: { id: run.id },
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
                data: { runId: run.id, index, type: block.type, content: JSON.stringify(block.content) },
              }),
            ),
          ]);
          await recordTokenUsage(agent.environmentId, totalTokens);

          send('run:done', {
            id: run.id,
            status: 'AWAITING_APPROVAL',
            tokens: totalTokens,
            cost,
            blocks: actionBlocks.map((b, i) => ({ index: i, type: b.type, content: b.content })),
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        await prisma.agentRun.update({
          where: { id: run.id },
          data: { status: 'FAILED', error: message, completedAt: new Date() },
        });
        send('run:error', { error: message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
