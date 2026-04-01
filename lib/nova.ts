import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './db';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Event types streamed back to the client ────────────────────────────────
export type NovaEvent =
  | { type: 'thinking' }
  | { type: 'tool_start'; name: string; label: string }
  | { type: 'tool_done'; name: string; label: string; summary: string }
  | { type: 'text'; text: string }
  | { type: 'done'; executionId: string; tokens: number }
  | { type: 'error'; message: string };

// ─── Tool definitions ────────────────────────────────────────────────────────
const NOVA_TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_systems',
    description: 'List all systems in the current environment with health scores and workflow counts.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'list_workflows',
    description: 'Get all workflows for the current system with their status and stage count.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_activity',
    description: 'Retrieve recent Nova interaction history and execution records for this system.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Number of records (default 8)' },
      },
    },
  },
  {
    name: 'create_workflow',
    description: 'Create a new workflow in the current system with named stages.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Workflow name' },
        description: { type: 'string', description: 'What this workflow accomplishes' },
        stages: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordered stage names, e.g. ["Research", "Draft", "Review", "Publish"]',
        },
        status: { type: 'string', enum: ['DRAFT', 'ACTIVE'] },
      },
      required: ['name', 'stages'],
    },
  },
  {
    name: 'update_workflow',
    description: 'Change the status or description of an existing workflow.',
    input_schema: {
      type: 'object' as const,
      properties: {
        workflowId: { type: 'string' },
        status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'] },
        description: { type: 'string' },
      },
      required: ['workflowId'],
    },
  },
  {
    name: 'set_health_score',
    description: 'Update the alignment/health score for the current system (0–100) based on your analysis.',
    input_schema: {
      type: 'object' as const,
      properties: {
        score: { type: 'number', description: 'Score 0–100' },
        reasoning: { type: 'string', description: 'Brief explanation' },
      },
      required: ['score'],
    },
  },
  {
    name: 'update_memory',
    description: 'Save important context, decisions, or patterns to persistent memory for this system. Call this when you learn something worth remembering across sessions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        memory: { type: 'string', description: 'Concise summary of what to remember — key decisions, patterns, priorities, context.' },
      },
      required: ['memory'],
    },
  },
];

// ─── Tool labels for UI display ───────────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  list_systems: 'Reading systems',
  list_workflows: 'Reading workflows',
  get_activity: 'Checking activity',
  create_workflow: 'Creating workflow',
  update_workflow: 'Updating workflow',
  set_health_score: 'Updating health score',
  update_memory: 'Saving to memory',
};

// ─── Tool executor ────────────────────────────────────────────────────────────
type ToolCtx = { systemId: string; environmentId: string; identityId: string };

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolCtx
): Promise<{ result: unknown; summary: string }> {
  switch (name) {
    case 'list_systems': {
      const systems = await prisma.system.findMany({
        where: { environmentId: ctx.environmentId },
        include: { _count: { select: { workflows: true } }, systemState: true },
        orderBy: { updatedAt: 'desc' },
      });
      const result = systems.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        healthScore: s.systemState?.healthScore ?? s.healthScore,
        workflowCount: s._count.workflows,
      }));
      return { result, summary: `${result.length} systems found` };
    }

    case 'list_workflows': {
      const workflows = await prisma.workflow.findMany({
        where: { systemId: ctx.systemId },
        orderBy: { updatedAt: 'desc' },
      });
      const result = workflows.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        status: w.status,
        stages: JSON.parse(w.stages ?? '[]'),
      }));
      return { result, summary: `${result.length} workflows found` };
    }

    case 'get_activity': {
      const limit = (input.limit as number) ?? 8;
      const [logs, executions] = await Promise.all([
        prisma.intelligenceLog.findMany({
          where: { systemId: ctx.systemId },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        prisma.execution.findMany({
          where: { systemId: ctx.systemId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);
      const result = {
        recentQueries: logs.map(l => ({
          query: (() => { try { return JSON.parse(l.input ?? '{}').query; } catch { return l.input; } })(),
          createdAt: l.createdAt,
          tokens: l.tokens,
        })),
        recentExecutions: executions.map(e => ({
          id: e.id,
          status: e.status,
          input: e.input,
          createdAt: e.createdAt,
        })),
      };
      return { result, summary: `${logs.length} interactions, ${executions.length} executions` };
    }

    case 'create_workflow': {
      const workflow = await prisma.workflow.create({
        data: {
          name: input.name as string,
          description: (input.description as string) ?? null,
          stages: JSON.stringify(input.stages ?? []),
          status: (input.status as string) ?? 'DRAFT',
          systemId: ctx.systemId,
          environmentId: ctx.environmentId,
          creatorId: ctx.identityId,
        },
      });
      return {
        result: { id: workflow.id, name: workflow.name, status: workflow.status },
        summary: `Created "${workflow.name}"`,
      };
    }

    case 'update_workflow': {
      const updated = await prisma.workflow.update({
        where: { id: input.workflowId as string },
        data: {
          ...(input.status ? { status: input.status as string } : {}),
          ...(input.description ? { description: input.description as string } : {}),
        },
      });
      return {
        result: { id: updated.id, name: updated.name, status: updated.status },
        summary: `Updated "${updated.name}" → ${updated.status}`,
      };
    }

    case 'set_health_score': {
      const score = input.score as number;
      await prisma.systemState.upsert({
        where: { systemId: ctx.systemId },
        update: { healthScore: score },
        create: { systemId: ctx.systemId, healthScore: score },
      });
      await prisma.system.update({
        where: { id: ctx.systemId },
        data: { healthScore: score / 100 },
      });
      return { result: { score, updated: true }, summary: `Health set to ${score}%` };
    }

    case 'update_memory': {
      const memory = input.memory as string;
      const intelligence = await prisma.intelligence.findFirst({ where: { systemId: ctx.systemId, name: 'Nova' } });
      if (intelligence) {
        await prisma.intelligenceLog.create({
          data: {
            action: 'memory_update',
            reasoning: memory,
            input: JSON.stringify({ updated: new Date().toISOString() }),
            output: JSON.stringify({ chars: memory.length }),
            success: true,
            intelligenceId: intelligence.id,
            systemId: ctx.systemId,
            identityId: ctx.identityId,
          },
        });
      }
      return { result: { saved: true }, summary: 'Memory updated' };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` }, summary: 'Tool failed' };
  }
}

// ─── Load conversation history ────────────────────────────────────────────────
async function loadHistory(systemId: string): Promise<Anthropic.MessageParam[]> {
  const logs = await prisma.intelligenceLog.findMany({
    where: { systemId, action: 'nova_query' },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  const messages: Anthropic.MessageParam[] = [];
  for (const log of logs.reverse()) {
    const query = (() => { try { return JSON.parse(log.input ?? '{}').query; } catch { return null; } })();
    const response = (() => { try { return JSON.parse(log.output ?? '{}').response; } catch { return null; } })();
    if (query && response) {
      messages.push({ role: 'user', content: query });
      messages.push({ role: 'assistant', content: response });
    }
  }
  return messages;
}

// ─── System prompt ────────────────────────────────────────────────────────────
function buildPrompt(ctx: {
  systemName: string;
  systemDescription: string | null;
  environmentName: string;
  identityName: string;
  workflows: { name: string; status: string }[];
  memory?: string | null;
}) {
  const wfList = ctx.workflows.length
    ? ctx.workflows.map(w => `  • ${w.name} [${w.status.toLowerCase()}]`).join('\n')
    : '  None configured';

  const memoryBlock = ctx.memory
    ? `\n**Persistent memory (what you know about this system):**\n${ctx.memory}\n`
    : '';

  return `You are Nova — the intelligence execution engine inside GRID, an adaptive organizational operating system.

You are operating inside the **${ctx.systemName}** system (${ctx.environmentName} environment).

**System purpose:** ${ctx.systemDescription ?? 'Not yet defined'}

**Current workflows:**
${wfList}
${memoryBlock}
**Your capabilities:**
You have tools to read and write GRID data. When a user asks you to do something actionable — create a workflow, update a status, analyse health — **use your tools and do it**. Don't just describe what you could do.

Use \`update_memory\` whenever you learn something worth persisting: decisions made, patterns observed, preferences, key context. Memory carries forward across all future conversations.

**Response style:**
- Be direct and operational. No filler.
- When you take an action, confirm it with specifics.
- Use **bold** for emphasis, bullet points for lists, headers (##) for sections.
- Keep responses concise unless a detailed breakdown is requested.

Operator: ${ctx.identityName}`;
}

// ─── Helper: get or create Nova intelligence record ───────────────────────────
export async function getOrCreateNovaIntelligence(
  systemId: string,
  environmentId: string,
  identityId: string
) {
  return (
    (await prisma.intelligence.findFirst({ where: { systemId, name: 'Nova', type: 'AI_AGENT' } })) ??
    (await prisma.intelligence.create({
      data: { type: 'AI_AGENT', name: 'Nova', systemId, environmentId, creatorId: identityId },
    }))
  );
}

// ─── Main agent runner ────────────────────────────────────────────────────────
export async function runNovaAgent({
  systemId,
  input,
  onEvent,
}: {
  systemId: string;
  input: string;
  onEvent: (event: NovaEvent) => void;
}): Promise<void> {
  // Load context
  const [system, identity] = await Promise.all([
    prisma.system.findUnique({
      where: { id: systemId },
      include: { environment: true, workflows: { orderBy: { updatedAt: 'desc' } } },
    }),
    prisma.identity.findFirst({ where: { email: 'demo@grid.app' } }),
  ]);

  if (!system) throw new Error('System not found');
  if (!identity) throw new Error('No identity found');

  const intelligence = await getOrCreateNovaIntelligence(system.id, system.environmentId, identity.id);

  // Resolve model — check Intelligence config, fall back to Opus
  const intelConfig = intelligence.config ? (() => { try { return JSON.parse(intelligence.config!); } catch { return {}; } })() : {};
  const novaModel: string = intelConfig.model ?? 'claude-opus-4-6';
  const execution = await prisma.execution.create({ data: { status: 'RUNNING', input, systemId } });

  const toolCtx: ToolCtx = {
    systemId: system.id,
    environmentId: system.environmentId,
    identityId: identity.id,
  };

  // Load most recent memory for this system
  const memoryLog = await prisma.intelligenceLog.findFirst({
    where: { systemId: system.id, action: 'memory_update' },
    orderBy: { createdAt: 'desc' },
  });

  const systemPrompt = buildPrompt({
    systemName: system.name,
    systemDescription: system.description,
    environmentName: system.environment.name,
    identityName: identity.name,
    workflows: system.workflows,
    memory: memoryLog?.reasoning ?? null,
  });

  const history = await loadHistory(systemId);
  const messages: Anthropic.MessageParam[] = [...history, { role: 'user', content: input }];

  let fullOutput = '';
  let totalTokens = 0;

  onEvent({ type: 'thinking' });

  // ── Agentic loop ─────────────────────────────────────────────────────────────
  for (let round = 0; round < 6; round++) {
    // Non-streaming call to detect tool use
    const response = await anthropic.messages.create({
      model: novaModel,
      max_tokens: 2048,
      system: systemPrompt,
      tools: NOVA_TOOLS,
      messages,
    });

    totalTokens += response.usage.input_tokens + response.usage.output_tokens;

    const toolBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    // ── Tool use round ──────────────────────────────────────────────────────
    if (response.stop_reason === 'tool_use' && toolBlocks.length > 0) {
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tb of toolBlocks) {
        const label = TOOL_LABELS[tb.name] ?? tb.name;
        onEvent({ type: 'tool_start', name: tb.name, label });

        const { result, summary } = await executeTool(
          tb.name,
          tb.input as Record<string, unknown>,
          toolCtx
        );

        onEvent({ type: 'tool_done', name: tb.name, label, summary });
        toolResults.push({ type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify(result) });
      }

      messages.push({ role: 'user', content: toolResults });
      continue; // next round
    }

    // ── Final text response — stream it ────────────────────────────────────
    const stream = anthropic.messages.stream({
      model: novaModel,
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    stream.on('text', text => {
      fullOutput += text;
      onEvent({ type: 'text', text });
    });

    const finalMsg = await stream.finalMessage();
    totalTokens += finalMsg.usage.input_tokens + finalMsg.usage.output_tokens;
    break;
  }

  // ── Persist ────────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.execution.update({
      where: { id: execution.id },
      data: { status: 'COMPLETED', output: fullOutput },
    }),
    prisma.intelligenceLog.create({
      data: {
        action: 'nova_query',
        input: JSON.stringify({ query: input }),
        output: JSON.stringify({ response: fullOutput }),
        tokens: totalTokens,
        success: true,
        intelligenceId: intelligence.id,
        identityId: identity.id,
        systemId: system.id,
      },
    }),
    prisma.systemState.upsert({
      where: { systemId: system.id },
      update: { lastActivity: new Date() },
      create: { systemId: system.id, lastActivity: new Date() },
    }),
  ]);

  onEvent({ type: 'done', executionId: execution.id, tokens: totalTokens });
}
