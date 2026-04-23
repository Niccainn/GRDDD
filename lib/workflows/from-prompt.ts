/**
 * Prompt → workflow graph converter.
 *
 * Bridges the Project-plan world (lib/projects/planner.ts) and the
 * visual Workflow builder (components/workflow/WorkflowBuilder.tsx).
 *
 * Input: a natural-language goal string.
 * Output: { nodes, edges } in the shape WorkflowBuilder stores in
 *   Workflow.nodes / Workflow.edges JSON.
 *
 * Every step from the planner becomes a node on the canvas with:
 *   - a tool type matching its location (Claude → 'ai', human → 'decision', others → 'task')
 *   - the rich classifier tuple preserved on the node
 *   - a rationale in the description field
 *   - the HITL gate reflected in a decision node (optional)
 *
 * Nodes are laid out vertically so they're readable without panning.
 */

import { planProject } from '@/lib/projects/planner';
import type { Step } from '@/lib/projects/types';

export type WFNode = {
  id: string;
  type: 'start' | 'end' | 'task' | 'ai' | 'decision' | 'trigger';
  x: number;
  y: number;
  label: string;
  description?: string;
  // Rich classifier — optional so the existing builder still
  // renders every node even without these fields. The inspector
  // panel edits them; the planner populates them on first import.
  location?: string;
  action?: string;
  interaction?: string;
  execution?: string;
  prompt?: string;
  integrationProvider?: string;
  approvalRequired?: boolean;
};

export type WFEdge = {
  id: string;
  source: string;
  sourcePort: 'out' | 'yes' | 'no';
  target: string;
  label?: string;
};

const STEP_Y = 110;
const CX = 80;

function nodeTypeForStep(step: Step): WFNode['type'] {
  if (step.tool === 'claude') return 'ai';
  if (step.tool === 'human') return 'decision';
  return 'task';
}

let _uid = 1000;
function uid(): string {
  return `n${Date.now()}_${_uid++}`;
}

export async function buildGraphFromPrompt(goal: string): Promise<{
  nodes: WFNode[];
  edges: WFEdge[];
  source: 'nova' | 'heuristic' | 'fallback';
  stepCount: number;
}> {
  const { plan, source } = await planProject(goal);

  const startId = uid();
  const endId = uid();
  const nodes: WFNode[] = [
    { id: startId, type: 'start', x: CX, y: 20, label: 'Start' },
  ];

  plan.forEach((step, i) => {
    const id = uid();
    nodes.push({
      id,
      type: nodeTypeForStep(step),
      x: CX,
      y: 20 + (i + 1) * STEP_Y,
      label: step.title.slice(0, 60),
      description: step.rationale,
      location: step.classifier?.location,
      action: step.classifier?.action,
      interaction: step.classifier?.interaction,
      execution: step.classifier?.execution,
      integrationProvider: step.tool,
      approvalRequired: Boolean(step.approval?.required),
      prompt: '', // user fills in via inspector
    });
  });

  nodes.push({
    id: endId,
    type: 'end',
    x: CX,
    y: 20 + (plan.length + 1) * STEP_Y,
    label: 'End',
  });

  const edges: WFEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: uid(),
      source: nodes[i].id,
      sourcePort: 'out',
      target: nodes[i + 1].id,
    });
  }

  return { nodes, edges, source, stepCount: plan.length };
}
