/**
 * Multi-Agent Orchestrator
 *
 * Handles agent-to-agent handoffs, shared context passing,
 * and pipeline execution. An orchestration is a chain of agent
 * runs where each agent's output feeds into the next agent's input.
 *
 * Orchestration modes:
 *   - Sequential: A → B → C (pipeline)
 *   - Parallel: A → [B, C] → D (fan-out/fan-in)
 *   - Conditional: A → (if condition) B else C
 */

import { prisma } from './db';

export type OrchestrationStep = {
  agentId: string;
  agentName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  runId?: string;
  input?: string;
  output?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
};

export type OrchestrationPlan = {
  id: string;
  mode: 'sequential' | 'parallel';
  steps: OrchestrationStep[];
  sharedContext: Record<string, unknown>;
};

/**
 * Build an orchestration plan from an agent's handoff graph.
 * Returns the ordered list of agents to invoke.
 */
export async function buildPlan(
  startAgentId: string,
  initialInput: string,
): Promise<OrchestrationPlan> {
  const startAgent = await prisma.agent.findUnique({
    where: { id: startAgentId },
    include: {
      canInvoke: {
        where: { callee: { status: 'ACTIVE', deletedAt: null } },
        include: { callee: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!startAgent) throw new Error('Agent not found');

  const steps: OrchestrationStep[] = [
    {
      agentId: startAgent.id,
      agentName: startAgent.name,
      status: 'pending',
      input: initialInput,
    },
  ];

  // Walk the handoff chain (depth-first, max 5 hops to prevent infinite loops)
  const visited = new Set<string>([startAgent.id]);
  let current = startAgent;

  for (let i = 0; i < 5; i++) {
    const handoffs = current.canInvoke.filter(h =>
      !visited.has(h.calleeId) && (h.trigger === 'always' || h.trigger === 'manual')
    );

    if (handoffs.length === 0) break;

    for (const handoff of handoffs) {
      visited.add(handoff.calleeId);
      steps.push({
        agentId: handoff.calleeId,
        agentName: handoff.callee.name,
        status: 'pending',
      });
    }

    // Follow the first handoff for sequential chains
    const next = await prisma.agent.findUnique({
      where: { id: handoffs[0].calleeId },
      include: {
        canInvoke: {
          where: { callee: { status: 'ACTIVE', deletedAt: null } },
          include: { callee: { select: { id: true, name: true } } },
        },
      },
    });

    if (!next) break;
    current = next;
  }

  return {
    id: `orch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mode: 'sequential',
    steps,
    sharedContext: {},
  };
}

/**
 * Get all agents that can be invoked by a given agent.
 */
export async function getInvocableAgents(agentId: string) {
  const handoffs = await prisma.agentHandoff.findMany({
    where: { callerId: agentId },
    include: {
      callee: {
        select: { id: true, name: true, description: true, emoji: true, status: true },
      },
    },
  });

  return handoffs.map(h => ({
    handoffId: h.id,
    agent: h.callee,
    trigger: h.trigger,
    condition: h.condition,
    passContext: h.passContext,
    passMemory: h.passMemory,
  }));
}

/**
 * Create a handoff between two agents.
 */
export async function createHandoff(params: {
  callerId: string;
  calleeId: string;
  trigger?: string;
  condition?: string;
  passContext?: boolean;
  passMemory?: boolean;
}) {
  return prisma.agentHandoff.create({
    data: {
      callerId: params.callerId,
      calleeId: params.calleeId,
      trigger: params.trigger ?? 'manual',
      condition: params.condition ?? null,
      passContext: params.passContext ?? true,
      passMemory: params.passMemory ?? false,
    },
  });
}

/**
 * Remove a handoff between two agents.
 */
export async function removeHandoff(callerId: string, calleeId: string) {
  return prisma.agentHandoff.deleteMany({
    where: { callerId, calleeId },
  });
}
