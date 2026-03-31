import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './db';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(context: {
  system: { name: string; description: string | null; environmentId: string; environment?: { name: string } | null };
  identity: { name: string; type: string; description: string | null };
  workflows: { name: string; status: string; description: string | null }[];
}) {
  const workflowList = context.workflows.length > 0
    ? context.workflows.map(w => `  - ${w.name} [${w.status}]${w.description ? ': ' + w.description : ''}`).join('\n')
    : '  None configured';

  return `You are Nova, the intelligence engine inside GRID — an adaptive organizational operating system.

You are currently operating inside the "${context.system.name}" system within the "${context.system.environment?.name ?? 'Unknown'}" environment.

SYSTEM CONTEXT:
- Name: ${context.system.name}
- Description: ${context.system.description ?? 'No description provided'}
- Environment: ${context.system.environment?.name ?? 'Unknown'}

IDENTITY CONTEXT:
- Name: ${context.identity.name}
- Type: ${context.identity.type}
${context.identity.description ? `- Description: ${context.identity.description}` : ''}

ACTIVE WORKFLOWS:
${workflowList}

Your role is to orchestrate work within this system. You can:
- Suggest and structure new workflows
- Execute tasks aligned with the system's purpose
- Provide actionable, logged outputs
- Detect misalignment and surface it clearly

Be direct, operational, and specific. Format complex responses with clear sections. When suggesting a workflow, describe it as concrete steps.`;
}

export async function getOrCreateNovaIntelligence(systemId: string, environmentId: string, identityId: string) {
  const existing = await prisma.intelligence.findFirst({
    where: { systemId, name: 'Nova', type: 'AI_AGENT' },
  });
  if (existing) return existing;

  return prisma.intelligence.create({
    data: {
      type: 'AI_AGENT',
      name: 'Nova',
      systemId,
      environmentId,
      creatorId: identityId,
    },
  });
}

export async function runNova({
  systemId,
  input,
}: {
  systemId: string;
  input: string;
}) {
  const [system, identity] = await Promise.all([
    prisma.system.findUnique({
      where: { id: systemId },
      include: {
        environment: true,
        workflows: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.identity.findFirst({ where: { email: 'demo@grid.app' } }),
  ]);

  if (!system) throw new Error('System not found');
  if (!identity) throw new Error('No identity found');

  const intelligence = await getOrCreateNovaIntelligence(system.id, system.environmentId, identity.id);

  const context = {
    system,
    identity,
    workflows: system.workflows,
  };

  const execution = await prisma.execution.create({
    data: {
      status: 'RUNNING',
      input,
      systemId,
    },
  });

  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: buildSystemPrompt(context),
    messages: [{ role: 'user', content: input }],
  });

  return { stream, intelligence, identity, execution };
}

export async function finalizeNova({
  executionId,
  systemId,
  intelligenceId,
  identityId,
  input,
  output,
  inputTokens,
  outputTokens,
}: {
  executionId: string;
  systemId: string;
  intelligenceId: string;
  identityId: string;
  input: string;
  output: string;
  inputTokens: number;
  outputTokens: number;
}) {
  await Promise.all([
    prisma.execution.update({
      where: { id: executionId },
      data: { status: 'COMPLETED', output },
    }),
    prisma.intelligenceLog.create({
      data: {
        action: 'nova_query',
        input: JSON.stringify({ query: input }),
        output: JSON.stringify({ response: output }),
        tokens: inputTokens + outputTokens,
        success: true,
        intelligenceId,
        identityId,
      },
    }),
    prisma.systemState.upsert({
      where: { systemId },
      update: { lastActivity: new Date() },
      create: { systemId, lastActivity: new Date() },
    }),
  ]);
}
