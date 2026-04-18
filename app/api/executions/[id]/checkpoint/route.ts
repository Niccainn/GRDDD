import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsExecution } from '@/lib/auth/ownership';
import { loadTrace } from '@/lib/kernel/trace';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;

  // Verify ownership before any data access
  await assertOwnsExecution(id, identity.id);

  // Fetch execution with workflow stages
  const execution = await prisma.execution.findUnique({
    where: { id },
    include: {
      system: { select: { environmentId: true } },
      workflow: { select: { id: true, name: true, stages: true, nodes: true } },
    },
  });
  if (!execution) return Response.json({ error: 'Execution not found' }, { status: 404 });

  // Verify environment access
  const env = await prisma.environment.findFirst({
    where: {
      id: execution.system.environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  // Parse workflow stages
  const stages = execution.workflow?.stages ? JSON.parse(execution.workflow.stages) : [];

  // Load traces for this execution to extract decision points
  const traces = await prisma.kernelTrace.findMany({
    where: {
      tenantId: identity.id,
      surface: 'workflow',
    },
    orderBy: { createdAt: 'desc' },
    take: stages.length || 5,
  });

  // Extract decision points from trace events
  const decisionPoints = extractDecisionPoints(traces, stages);

  // Identify the critical decision — the highest-impact decision point
  const criticalDecision = decisionPoints.find(d => d.impact === 'high') || decisionPoints[0] || null;

  // Build stage highlights
  const stageHighlights = stages.map((stage: { name: string; id?: string; description?: string }, i: number) => {
    const trace = traces[i];
    return {
      stageId: stage.id || `stage-${i}`,
      stageName: stage.name,
      description: stage.description || null,
      tokens: trace?.inputTokens ? trace.inputTokens + trace.outputTokens : 0,
      costUsd: trace?.costUsd || 0,
      durationMs: trace?.durationMs || 0,
      toolCalls: trace?.toolCalls || 0,
      hasCriticalDecision: criticalDecision?.stageId === (stage.id || `stage-${i}`),
    };
  });

  // Build summary
  const totalTokens = stageHighlights.reduce((sum: number, s: { tokens: number }) => sum + s.tokens, 0);
  const totalCost = stageHighlights.reduce((sum: number, s: { costUsd: number }) => sum + s.costUsd, 0);

  return Response.json({
    executionId: id,
    workflowName: execution.workflow?.name || 'Unknown',
    status: execution.status,
    summary: `${stages.length} stages completed using ${totalTokens.toLocaleString()} tokens ($${totalCost.toFixed(4)})`,
    criticalDecision,
    stageHighlights,
    decisionPoints,
    completedAt: execution.completedAt,
  });
}

type TraceRecord = {
  payload: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  toolCalls: number;
};

type StageInfo = {
  id?: string;
  name: string;
};

type DecisionPointResult = {
  stageId: string;
  stageName: string;
  decision: string;
  reasoning: string | null;
  impact: 'high' | 'medium' | 'low';
  alternatives: string[] | null;
};

function extractDecisionPoints(traces: TraceRecord[], stages: StageInfo[]): DecisionPointResult[] {
  const points: DecisionPointResult[] = [];

  for (let i = 0; i < traces.length && i < stages.length; i++) {
    const trace = traces[i];
    const stage = stages[i];

    let payload: { events?: Array<{ type: string; toolName?: string; args?: Record<string, unknown>; text?: string; summary?: string }> } = { events: [] };
    try {
      payload = JSON.parse(trace.payload);
    } catch {
      continue;
    }

    const events = payload.events || [];

    // Extract tool calls as decisions
    const toolCalls = events.filter(e => e.type === 'tool_call');
    const reasoningEvents = events.filter(e => e.type === 'reasoning');

    if (toolCalls.length > 0) {
      // The most significant tool call (first one) represents the key decision
      const mainTool = toolCalls[0];
      const reasoning = reasoningEvents[0]?.text || null;

      points.push({
        stageId: stage.id || `stage-${i}`,
        stageName: stage.name,
        decision: `Used ${mainTool.toolName}${mainTool.args ? ` with ${Object.keys(mainTool.args).join(', ')}` : ''}`,
        reasoning,
        impact: toolCalls.length > 2 ? 'high' : toolCalls.length > 1 ? 'medium' : 'low',
        alternatives: toolCalls.length > 1 ? toolCalls.slice(1).map(t => t.toolName || 'unknown') : null,
      });
    } else if (reasoningEvents.length > 0) {
      // Pure reasoning stage — the decision is the approach taken
      points.push({
        stageId: stage.id || `stage-${i}`,
        stageName: stage.name,
        decision: `Generated output via ${stage.name}`,
        reasoning: reasoningEvents[0]?.text?.slice(0, 200) || null,
        impact: 'medium',
        alternatives: null,
      });
    }
  }

  return points;
}
