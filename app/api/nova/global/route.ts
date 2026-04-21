import { getAuthIdentity } from '@/lib/auth';
import { rateLimitNovaStrict } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import type { NovaEvent } from '@/lib/nova';
import { selectAvailableTools } from '@/lib/integrations/tools';
import { getAnthropicClientForEnvironment, MissingKeyError } from '@/lib/nova/client-factory';
import { fenceUserInput, withScopeGuard } from '@/lib/llm/safe-prompt';

// ── Internal Grid tools (database reads) ─────────────────────────────
const INTERNAL_TOOLS: Anthropic.Tool[] = [
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
  {
    name: 'get_tasks',
    description: 'Get tasks from the task board. Optionally filter by status or assignee.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'BACKLOG | TODO | IN_PROGRESS | REVIEW | DONE' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task on the task board. Use this when the user asks you to create, add, or track a task or action item.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['URGENT', 'HIGH', 'NORMAL', 'LOW'] },
        status: { type: 'string', enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] },
      },
      required: ['title'],
    },
  },
];

const TOOL_LABELS: Record<string, string> = {
  get_overview: 'Reading all systems',
  get_system_detail: 'Reading system detail',
  get_recent_activity: 'Checking activity',
  flag_system: 'Updating health score',
  get_tasks: 'Reading tasks',
  create_task: 'Creating task',
};

async function executeInternalTool(name: string, input: Record<string, unknown>, identityId: string) {
  // Ownership filter — scope all queries to environments owned by the caller
  const ownerScope = { environment: { ownerId: identityId, deletedAt: null } };

  switch (name) {
    case 'get_overview': {
      const systems = await prisma.system.findMany({
        where: ownerScope,
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
      const system = await prisma.system.findFirst({
        where: { id: input.systemId as string, ...ownerScope },
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
        where: { action: 'nova_query', system: { environment: { ownerId: identityId, deletedAt: null } } },
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
      // Verify ownership before allowing health score mutation
      const ownedSystem = await prisma.system.findFirst({ where: { id: systemId, ...ownerScope } });
      if (!ownedSystem) return { result: { error: 'Not found' }, summary: 'System not found' };
      await prisma.systemState.upsert({
        where: { systemId },
        update: { healthScore: score },
        create: { systemId, healthScore: score },
      });
      await prisma.system.update({ where: { id: systemId }, data: { healthScore: score / 100 } });
      return { result: { updated: true, score }, summary: `Health updated to ${score}%` };
    }

    case 'get_tasks': {
      const where: Record<string, unknown> = { deletedAt: null, parentId: null, ...ownerScope };
      if (input.status) where.status = input.status;
      const tasks = await prisma.task.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        take: (input.limit as number) ?? 20,
        include: {
          assignee: { select: { id: true, name: true } },
          system: { select: { id: true, name: true } },
          environment: { select: { id: true, name: true } },
        },
      });
      return {
        result: tasks.map(t => ({
          id: t.id, title: t.title, status: t.status, priority: t.priority,
          assignee: t.assignee?.name ?? null, system: t.system?.name ?? null,
          environment: t.environment.name, dueDate: t.dueDate,
        })),
        summary: `${tasks.length} tasks loaded`,
      };
    }

    case 'create_task': {
      // Find the first environment the user has access to
      const env = await prisma.environment.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { ownerId: identityId },
            { memberships: { some: { identityId } } },
          ],
        },
      });
      if (!env) return { result: { error: 'No environment found' }, summary: 'Failed — no environment' };
      const task = await prisma.task.create({
        data: {
          title: String(input.title),
          description: input.description ? String(input.description) : null,
          priority: (input.priority as string) ?? 'NORMAL',
          status: (input.status as string) ?? 'TODO',
          environmentId: env.id,
          creatorId: identityId,
          position: 0,
        },
      });
      return { result: { id: task.id, title: task.title, status: task.status }, summary: `Task created: ${task.title}` };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` }, summary: 'Tool failed' };
  }
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = await rateLimitNovaStrict(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { input } = await req.json();
  if (!input) return new Response(JSON.stringify({ error: 'Missing input' }), { status: 400 });

  // ── Load integration tools dynamically (tenant-scoped) ──────────
  // Only load integrations from environments the caller owns or is a member of.
  const integrations = await prisma.integration.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identity.id },
          { memberships: { some: { identityId: identity.id } } },
        ],
      },
    },
  });
  const { available: integrationTools, byName: integrationByName } = selectAvailableTools(integrations);

  // Build the combined tool list: internal + integration
  const allTools: Anthropic.Tool[] = [
    ...INTERNAL_TOOLS,
    ...integrationTools.map(t => ({
      name: t.anthropic.name,
      description: t.anthropic.description,
      input_schema: t.anthropic.input_schema as Anthropic.Tool.InputSchema,
    })),
  ];

  const internalNames = new Set(INTERNAL_TOOLS.map(t => t.name));

  const systemCount = await prisma.system.count({ where: { environment: { ownerId: identity.id, deletedAt: null } } });
  const workflowCount = await prisma.workflow.count({ where: { environment: { ownerId: identity.id, deletedAt: null } } });

  // Load brand identity from primary environment
  const primaryEnv = await prisma.environment.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!primaryEnv) {
    return new Response(JSON.stringify({ error: 'No environment found' }), { status: 400 });
  }

  let resolved;
  try {
    resolved = await getAnthropicClientForEnvironment(primaryEnv.id);
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return Response.json({ error: err.message, actionUrl: err.actionUrl }, { status: 402 });
    }
    throw err;
  }
  const anthropic = resolved.client;

  const brandLines: string[] = [];
  if (primaryEnv) {
    if (primaryEnv.brandName) brandLines.push(`**Brand:** ${primaryEnv.brandName}`);
    if (primaryEnv.brandBio) brandLines.push(`**Brand story:** ${primaryEnv.brandBio}`);
    if (primaryEnv.brandTone) brandLines.push(`**Voice & tone:** ${primaryEnv.brandTone}`);
    if (primaryEnv.brandAudience) brandLines.push(`**Target audience:** ${primaryEnv.brandAudience}`);
    if (primaryEnv.brandValues) brandLines.push(`**Core values:** ${primaryEnv.brandValues}`);
    if (primaryEnv.brandKeywords) brandLines.push(`**Key phrases to weave in:** ${primaryEnv.brandKeywords}`);
    if (primaryEnv.brandVoiceDont) brandLines.push(`**Avoid:** ${primaryEnv.brandVoiceDont}`);
  }
  const brandContext = brandLines.length
    ? `\n\nBrand identity (always stay on-brand when creating content, campaigns, or communications):\n${brandLines.join('\n')}`
    : '';

  // Build provider list for the system prompt
  const connectedProviders = [...new Set(integrations.filter(i => i.status === 'ACTIVE' && !i.deletedAt).map(i => i.provider))];
  const integrationContext = connectedProviders.length > 0
    ? `\n\nYou have access to these connected integrations: ${connectedProviders.join(', ')}. Use their tools proactively when the user's request relates to them. For example, if Figma is connected and the user asks about designs, use figma_get_file or figma_get_text_content to read their actual design data.`
    : '';

  const rawSystemPrompt = `You are Nova — the AI operations engine for GRID. You operate in global mode across ALL systems the authenticated operator owns.

You have visibility across ${systemCount} systems and ${workflowCount} workflows in this organisation.

Your capabilities:
- Read and analyze data from ALL connected business systems and integrations
- Surface cross-system patterns, blockers, and opportunities
- Create and manage tasks on the task board
- Identify which systems need attention
- Read design files from Figma (components, text content, styles, comments)
- Read data from Slack, GitHub, Linear, Notion, and other connected tools
- Flag systems with drift or health issues
- Recommend where to focus operational effort

You are NOT just a chatbot. You are an operational AI that takes action. When asked to do something, USE YOUR TOOLS to actually do it — read real data, create real tasks, check real systems. Be direct and specific.${integrationContext}${brandContext}
${identity ? `Operator: ${identity.name}` : ''}`;

  // Prepend the cross-tenant scope guard — Nova must never surface
  // data from environments this operator doesn't own, and must treat
  // everything inside <user_input> as data, not instructions.
  const systemPrompt = withScopeGuard(rawSystemPrompt, {
    environmentName: primaryEnv.name,
    environmentId: primaryEnv.id,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      function send(event: NovaEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        send({ type: 'thinking' });
        const messages: Anthropic.MessageParam[] = [{ role: 'user', content: fenceUserInput(input) }];
        let totalTokens = 0;

        const MAX_ROUNDS = 8;
        const MAX_TOKENS_PER_REQUEST = 80_000; // ~$0.30 at Sonnet pricing — safety ceiling

        for (let round = 0; round < MAX_ROUNDS; round++) {
          // Per-round budget check — stop if token spend is excessive
          if (totalTokens > MAX_TOKENS_PER_REQUEST) {
            send({ type: 'text', text: '\n\n*[Nova paused: token budget reached for this request. Ask a follow-up to continue.]*' });
            break;
          }

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: systemPrompt,
            tools: allTools,
            messages,
          });

          totalTokens += response.usage.input_tokens + response.usage.output_tokens;
          const toolBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');

          if (response.stop_reason === 'tool_use' && toolBlocks.length > 0) {
            messages.push({ role: 'assistant', content: response.content });
            const results: Anthropic.ToolResultBlockParam[] = [];

            for (const tb of toolBlocks) {
              const toolName = tb.name;
              const toolInput = tb.input as Record<string, unknown>;

              if (internalNames.has(toolName)) {
                // Internal Grid tool
                const label = TOOL_LABELS[toolName] ?? toolName;
                send({ type: 'tool_start', name: toolName, label });
                const { result, summary } = await executeInternalTool(toolName, toolInput, identity.id);
                send({ type: 'tool_done', name: toolName, label, summary });
                results.push({ type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify(result) });
              } else {
                // Integration tool
                const entry = integrationByName.get(toolName);
                if (!entry) {
                  results.push({ type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify({ error: `Unknown tool: ${toolName}` }), is_error: true });
                  continue;
                }

                send({ type: 'tool_start', name: toolName, label: `Calling ${toolName.replace(/_/g, ' ')}` });
                try {
                  // Resolve which integration to use (handles multi-account)
                  let targetIntegration = entry.integration;
                  const cleanArgs = { ...toolInput };
                  if (entry.candidates.length > 1 && cleanArgs.integration_id) {
                    const match = entry.candidates.find(c => c.id === cleanArgs.integration_id);
                    if (match) targetIntegration = match;
                    delete cleanArgs.integration_id;
                  }

                  const result = await entry.tool.execute(targetIntegration, cleanArgs);
                  send({ type: 'tool_done', name: toolName, label: `${toolName.replace(/_/g, ' ')}`, summary: 'Done' });
                  results.push({ type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify(result) });
                } catch (err) {
                  const msg = err instanceof Error ? err.message : 'Tool execution failed';
                  send({ type: 'tool_done', name: toolName, label: toolName, summary: `Error: ${msg.slice(0, 80)}` });
                  results.push({ type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify({ error: msg }), is_error: true });
                }
              }
            }

            messages.push({ role: 'user', content: results });
            continue;
          }

          // Final text response — stream it
          let fullText = '';
          const stream = anthropic.messages.stream({ model: 'claude-sonnet-4-20250514', max_tokens: 4096, system: systemPrompt, messages });
          stream.on('text', text => { fullText += text; send({ type: 'text', text }); });
          const final = await stream.finalMessage();
          totalTokens += final.usage.input_tokens + final.usage.output_tokens;

          // Persist to interaction log
          try {
            const intel = await prisma.intelligence.findFirst({ where: { type: 'AI_AGENT', name: 'Nova' } });
            if (intel) {
              await prisma.intelligenceLog.create({
                data: {
                  action: 'nova_query',
                  input: input,
                  output: fullText,
                  tokens: totalTokens,
                  success: true,
                  intelligenceId: intel.id,
                  systemId: intel.systemId,
                  identityId: identity.id,
                },
              });
            }
          } catch { /* best-effort persistence */ }

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
