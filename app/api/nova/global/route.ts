import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import type { NovaEvent } from '@/lib/nova';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GLOBAL_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_overview',
    description: 'Get a full snapshot of all systems, workflows, and health scores across the organisation.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_system_detail',
    description: 'Get detailed information about a specific system including its workflows and recent activity.',
    input_schema: {
      type: 'object' as const,
      properties: { systemId: { type: 'string' } },
      required: ['systemId'],
    },
  },
  {
    name: 'get_recent_activity',
    description: 'Get recent Nova interactions and executions across all systems.',
    input_schema: {
      type: 'object' as const,
      properties: { limit: { type: 'number' } },
    },
  },
  {
    name: 'flag_system',
    description: 'Update the health score of a system to flag it as drifting or healthy.',
    input_schema: {
      type: 'object' as const,
      properties: {
        systemId: { type: 'string' },
        healthScore: { type: 'number', description: '0–100' },
        reason: { type: 'string' },
      },
      required: ['systemId', 'healthScore'],
    },
  },
];

const TOOL_LABELS: Record<string, string> = {
  get_overview: 'Reading all systems',
  get_system_detail: 'Reading system detail',
  get_recent_activity: 'Checking activity',
  flag_system: 'Updating health score',
};

async function executeGlobalTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case 'get_overview': {
      const systems = await prisma.system.findMany({
        include: {
          environment: true,
          systemState: true,
          _count: { select: { workflows: true, executions: true } },
          workflows: { where: { status: 'ACTIVE' } },
        },
        orderBy: { updatedAt: 'desc' },
      });
      const result = systems.map(s => ({
        id: s.id,
        name: s.name,
        environment: s.environment.name,
        healthScore: s.systemState?.healthScore ?? (s.healthScore ? s.healthScore * 100 : null),
        activeWorkflows: s.workflows.length,
        totalWorkflows: s._count.workflows,
      }));
      return { result, summary: `${result.length} systems loaded` };
    }

    case 'get_system_detail': {
      const system = await prisma.system.findUnique({
        where: { id: input.systemId as string },
        include: {
          environment: true,
          workflows: { orderBy: { updatedAt: 'desc' } },
          systemState: true,
          _count: { select: { executions: true } },
        },
      });
      if (!system) return { result: { error: 'Not found' }, summary: 'System not found' };
      return {
        result: {
          id: system.id,
          name: system.name,
          description: system.description,
          environment: system.environment.name,
          healthScore: system.systemState?.healthScore ?? (system.healthScore ? system.healthScore * 100 : null),
          workflows: system.workflows.map(w => ({ id: w.id, name: w.name, status: w.status })),
          executions: system._count.executions,
        },
        summary: `${system.name} loaded`,
      };
    }

    case 'get_recent_activity': {
      const limit = (input.limit as number) ?? 10;
      const logs = await prisma.intelligenceLog.findMany({
        where: { action: 'nova_query' },
        include: { system: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return {
        result: logs.map(l => ({
          system: l.system?.name,
          query: (() => { try { return JSON.parse(l.input ?? '{}').query; } catch { return l.input; } })(),
          createdAt: l.createdAt,
        })),
        summary: `${logs.length} recent interactions`,
      };
    }

    case 'flag_system': {
      const score = input.healthScore as number;
      const systemId = input.systemId as string;
      await prisma.systemState.upsert({
        where: { systemId },
        update: { healthScore: score },
        create: { systemId, healthScore: score },
      });
      await prisma.system.update({ where: { id: systemId }, data: { healthScore: score / 100 } });
      return { result: { updated: true, score }, summary: `Health updated to ${score}%` };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` }, summary: 'Tool failed' };
  }
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { input } = await req.json();
  if (!input) return new Response(JSON.stringify({ error: 'Missing input' }), { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });

  const systemCount = await prisma.system.count();
  const workflowCount = await prisma.workflow.count();

  const systemPrompt = `You are Nova — operating in global mode across ALL systems in GRID.

You have visibility across ${systemCount} systems and ${workflowCount} workflows in this organisation.

Your role:
- Surface cross-system patterns, blockers, and opportunities
- Identify which systems need attention
- Recommend where to focus operational effort
- Flag systems with drift or health issues

Use your tools to read live data before responding. Be direct and specific.
${identity ? `Operator: ${identity.name}` : ''}`;

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      function send(event: NovaEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        send({ type: 'thinking' });
        const messages: Anthropic.MessageParam[] = [{ role: 'user', content: input }];
        let totalTokens = 0;

        for (let round = 0; round < 5; round++) {
          const response = await anthropic.messages.create({
            model: 'claude-opus-4-6',
            max_tokens: 2048,
            system: systemPrompt,
            tools: GLOBAL_TOOLS,
            messages,
          });

          totalTokens += response.usage.input_tokens + response.usage.output_tokens;
          const toolBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');

          if (response.stop_reason === 'tool_use' && toolBlocks.length > 0) {
            messages.push({ role: 'assistant', content: response.content });
            const results: Anthropic.ToolResultBlockParam[] = [];

            for (const tb of toolBlocks) {
              send({ type: 'tool_start', name: tb.name, label: TOOL_LABELS[tb.name] ?? tb.name });
              const { result, summary } = await executeGlobalTool(tb.name, tb.input as Record<string, unknown>);
              send({ type: 'tool_done', name: tb.name, label: TOOL_LABELS[tb.name] ?? tb.name, summary });
              results.push({ type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify(result) });
            }

            messages.push({ role: 'user', content: results });
            continue;
          }

          const stream = anthropic.messages.stream({ model: 'claude-opus-4-6', max_tokens: 2048, system: systemPrompt, messages });
          stream.on('text', text => send({ type: 'text', text }));
          const final = await stream.finalMessage();
          totalTokens += final.usage.input_tokens + final.usage.output_tokens;
          break;
        }

        send({ type: 'done', executionId: 'global', tokens: totalTokens, cost: 0 });
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Nova failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
