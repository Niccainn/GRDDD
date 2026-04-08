import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './db';
import { calculateCost, checkBudget, recordTokenUsage } from './cost';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Event types streamed back to the client ────────────────────────────────
export type NovaEvent =
  | { type: 'thinking' }
  | { type: 'reasoning'; text: string }
  | { type: 'tool_start'; name: string; label: string }
  | { type: 'tool_done'; name: string; label: string; summary: string }
  | { type: 'text'; text: string }
  | { type: 'budget_warning'; used: number; budget: number }
  | { type: 'done'; executionId: string; tokens: number; cost: number }
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
  {
    name: 'list_goals',
    description: 'Read the current goals for this system — OKR-style objectives with status, metric, target, and progress.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'update_goal',
    description: 'Update the status or current value for a goal in this system.',
    input_schema: {
      type: 'object' as const,
      properties: {
        goalId:  { type: 'string', description: 'The ID of the goal to update' },
        status:  { type: 'string', enum: ['ON_TRACK', 'AT_RISK', 'BEHIND', 'ACHIEVED', 'CANCELLED'] },
        current: { type: 'string', description: 'Current value of the metric' },
        progress:{ type: 'number', description: 'Progress percentage 0-100' },
      },
      required: ['goalId'],
    },
  },
  {
    name: 'analyse_cross_system',
    description: 'Analyse patterns, bottlenecks, and opportunities across all systems in the environment. Returns a holistic organizational view.',
    input_schema: {
      type: 'object' as const,
      properties: {
        focus: { type: 'string', description: 'What to focus the analysis on: "health", "bottlenecks", "opportunities", "alignment"' },
      },
    },
  },
  {
    name: 'create_signal',
    description: 'Route a new signal (task/request/alert) to the inbox for triage or direct system routing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Signal title' },
        body: { type: 'string', description: 'Signal details' },
        priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
        targetSystemId: { type: 'string', description: 'System to route to (optional)' },
      },
      required: ['title'],
    },
  },
];

// ─── Tool labels for UI display ───────────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  list_systems: 'Scanning systems',
  list_workflows: 'Reading workflows',
  get_activity: 'Reviewing activity',
  create_workflow: 'Creating workflow',
  update_workflow: 'Updating workflow',
  set_health_score: 'Calibrating health',
  update_memory: 'Persisting memory',
  list_goals: 'Reading objectives',
  update_goal: 'Updating objective',
  analyse_cross_system: 'Cross-system analysis',
  create_signal: 'Routing signal',
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
        where: { environmentId: ctx.environmentId, deletedAt: null },
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
        where: { systemId: ctx.systemId, deletedAt: null },
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
        data: { healthScore: score },
      });
      return { result: { score, updated: true }, summary: `Health set to ${score}%` };
    }

    case 'update_memory': {
      const memory = input.memory as string;
      const intelligence = await prisma.intelligence.findFirst({ where: { systemId: ctx.systemId, name: 'Nova', type: 'AI_AGENT' } });
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

    case 'list_goals': {
      const goals = await prisma.goal.findMany({
        where: { systemId: ctx.systemId },
        orderBy: { createdAt: 'desc' },
      });
      return {
        result: goals.map(g => ({
          id: g.id,
          title: g.title,
          metric: g.metric,
          target: g.target,
          current: g.current,
          status: g.status,
          progress: g.progress,
          dueDate: g.dueDate?.toISOString().slice(0, 10) ?? null,
        })),
        summary: `${goals.length} goal${goals.length !== 1 ? 's' : ''} found`,
      };
    }

    case 'update_goal': {
      const goalId  = input.goalId as string;
      const updates: Record<string, unknown> = {};
      if (input.status   !== undefined) updates.status   = input.status;
      if (input.current  !== undefined) updates.current  = input.current;
      if (input.progress !== undefined) updates.progress = input.progress;
      const updated = await prisma.goal.update({ where: { id: goalId }, data: updates });
      return {
        result: { id: updated.id, status: updated.status, current: updated.current },
        summary: `Goal "${updated.title}" updated → ${updated.status}`,
      };
    }

    case 'analyse_cross_system': {
      const systems = await prisma.system.findMany({
        where: { environmentId: ctx.environmentId, deletedAt: null },
        include: {
          systemState: true,
          _count: { select: { workflows: true, executions: true, goals: true } },
          goals: { where: { status: { in: ['BEHIND', 'AT_RISK'] } } },
        },
      });
      const result = {
        systems: systems.map(s => ({
          id: s.id,
          name: s.name,
          health: s.systemState?.healthScore ?? s.healthScore,
          workflows: s._count.workflows,
          executions: s._count.executions,
          goals: s._count.goals,
          atRiskGoals: s.goals.map(g => ({ title: g.title, status: g.status })),
          lastActivity: s.systemState?.lastActivity,
        })),
        environmentHealth: systems.length > 0
          ? systems.reduce((sum, s) => sum + (s.systemState?.healthScore ?? s.healthScore ?? 0), 0) / systems.length
          : null,
      };
      return { result, summary: `Analysed ${systems.length} systems` };
    }

    case 'create_signal': {
      const signal = await prisma.signal.create({
        data: {
          title: input.title as string,
          body: (input.body as string) ?? null,
          source: 'nova',
          priority: (input.priority as string) ?? 'NORMAL',
          environmentId: ctx.environmentId,
          systemId: (input.targetSystemId as string) ?? ctx.systemId,
        },
      });
      return {
        result: { id: signal.id, title: signal.title, priority: signal.priority },
        summary: `Signal "${signal.title}" created`,
      };
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
  contextDocs?: { title: string; body: string }[];
}) {
  const wfList = ctx.workflows.length
    ? ctx.workflows.map(w => `  • ${w.name} [${w.status.toLowerCase()}]`).join('\n')
    : '  None configured';

  const memoryBlock = ctx.memory
    ? `\n**Persistent memory (what you know about this system):**\n${ctx.memory}\n`
    : '';

  const contextBlock = ctx.contextDocs?.length
    ? `\n**System knowledge documents:**\n${ctx.contextDocs.map(d => `### ${d.title}\n${d.body}`).join('\n\n')}\n`
    : '';

  return `You are Nova — the intelligence layer inside GRID, an adaptive organizational operating system that bridges human teams and AI into a unified workspace.

You are NOT a chatbot. You are an embedded AGI agent with persistent memory, tools, and organizational awareness. You understand the structure of work — environments, systems, workflows, goals — and you act within it.

You are currently operating inside the **${ctx.systemName}** system in the **${ctx.environmentName}** environment.

**System purpose:** ${ctx.systemDescription ?? 'Not yet defined'}

**Current workflows:**
${wfList}
${memoryBlock}${contextBlock}
**Your capabilities:**
You have tools to observe and act on the organizational state. When a user asks you to do something — create a workflow, flag health issues, route signals, analyse cross-system patterns — **do it immediately with your tools**. Don't describe. Act.

You can also:
- **Analyse cross-system** to identify bottlenecks, misalignment, and opportunities across all systems
- **Create signals** to route work to the right system
- **Persist memory** — save decisions, patterns, and context that carry forward across all future conversations

**What makes you different from other AI:**
You don't just answer questions. You understand organizational structure and can take actions within it. You see the health of systems, the status of goals, the flow of workflows — and you intervene when needed. You are the intelligence layer that makes the invisible infrastructure work.

**Response style:**
- Direct and operational. No filler.
- When you take an action, confirm with specifics.
- Use **bold** for emphasis, bullet points for lists, headers (##) for sections.
- Show your reasoning when making decisions — transparency builds trust.
- If you notice something concerning (low health, stalled workflows, missed goals), proactively surface it.

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
  identityId,
  input,
  onEvent,
}: {
  systemId: string;
  identityId: string;
  input: string;
  onEvent: (event: NovaEvent) => void;
}): Promise<void> {
  // Load context
  const system = await prisma.system.findUnique({
    where: { id: systemId },
    include: { environment: true, workflows: { where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } } },
  });

  if (!system) throw new Error('System not found');

  const identity = await prisma.identity.findUnique({ where: { id: identityId } });
  if (!identity) throw new Error('Identity not found');

  // Check budget
  const budget = await checkBudget(system.environmentId);
  if (!budget.allowed) {
    onEvent({ type: 'error', message: 'Token budget exceeded for this environment. Contact an admin to increase the budget.' });
    return;
  }

  const intelligence = await getOrCreateNovaIntelligence(system.id, system.environmentId, identity.id);

  // Resolve model
  const intelConfig = intelligence.config ? (() => { try { return JSON.parse(intelligence.config!); } catch { return {}; } })() : {};
  const novaModel: string = intelConfig.model ?? 'claude-sonnet-4-6';
  const execution = await prisma.execution.create({ data: { status: 'RUNNING', input, systemId } });

  const toolCtx: ToolCtx = {
    systemId: system.id,
    environmentId: system.environmentId,
    identityId: identity.id,
  };

  // Load memory and context docs
  const [memoryLog, contextDocs] = await Promise.all([
    prisma.intelligenceLog.findFirst({
      where: { systemId: system.id, action: 'memory_update' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.intelligence.findMany({
      where: { systemId: system.id, type: 'CONTEXT_DOC', isActive: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const systemPrompt = buildPrompt({
    systemName: system.name,
    systemDescription: system.description,
    environmentName: system.environment.name,
    identityName: identity.name,
    workflows: system.workflows,
    memory: memoryLog?.reasoning ?? null,
    contextDocs: contextDocs.map(d => ({
      title: d.name,
      body: (() => { try { return JSON.parse(d.metadata ?? '{}').body ?? ''; } catch { return ''; } })(),
    })).filter(d => d.body),
  });

  const history = await loadHistory(systemId);
  const messages: Anthropic.MessageParam[] = [...history, { role: 'user', content: input }];

  let fullOutput = '';
  let totalTokens = 0;

  onEvent({ type: 'thinking' });

  // ── Agentic loop ─────────────────────────────────────────────────────────────
  for (let round = 0; round < 6; round++) {
    const response = await anthropic.messages.create({
      model: novaModel,
      max_tokens: 4096,
      system: systemPrompt,
      tools: NOVA_TOOLS,
      messages,
    });

    totalTokens += response.usage.input_tokens + response.usage.output_tokens;

    const toolBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

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
      continue;
    }

    // Final text response — stream it
    const stream = anthropic.messages.stream({
      model: novaModel,
      max_tokens: 4096,
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

  // Calculate cost
  const cost = calculateCost(novaModel, totalTokens * 0.7, totalTokens * 0.3);

  // Persist
  await Promise.all([
    prisma.execution.update({
      where: { id: execution.id },
      data: { status: 'COMPLETED', output: fullOutput, completedAt: new Date() },
    }),
    prisma.intelligenceLog.create({
      data: {
        action: 'nova_query',
        input: JSON.stringify({ query: input }),
        output: JSON.stringify({ response: fullOutput }),
        tokens: totalTokens,
        cost,
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
    recordTokenUsage(system.environmentId, totalTokens),
  ]);

  // Budget warning
  if (budget.budget !== null && budget.used + totalTokens >= budget.budget * 0.8) {
    onEvent({ type: 'budget_warning', used: budget.used + totalTokens, budget: budget.budget });
  }

  onEvent({ type: 'done', executionId: execution.id, tokens: totalTokens, cost });
}
