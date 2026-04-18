/**
 * Per-system agent pool — runtime resolution + scoping.
 *
 * Every System can have at most one SystemAgent row. When Nova is
 * invoked with a `systemId` in its context, the runtime looks up the
 * system's agent (if any), merges its persona onto the base Nova
 * system prompt, and narrows the tool registry to the agent's
 * allow-list.
 *
 * Absence of a SystemAgent = the system uses the env-wide Nova
 * defaults (same behaviour as before this module shipped). So this is
 * additive — nothing existing breaks.
 */

import { prisma } from '../db';

export type SystemAgentConfig = {
  id: string;
  systemId: string;
  name: string;
  persona: string;
  toolAllowList: string[];
  autonomyTier: 'Observe' | 'Suggest' | 'Act' | 'Autonomous' | 'Self-Direct';
};

const VALID_AUTONOMY: SystemAgentConfig['autonomyTier'][] = [
  'Observe',
  'Suggest',
  'Act',
  'Autonomous',
  'Self-Direct',
];

function coerceAutonomy(raw: string): SystemAgentConfig['autonomyTier'] {
  const found = VALID_AUTONOMY.find(t => t.toLowerCase() === raw.toLowerCase());
  return found ?? 'Suggest';
}

/**
 * Fetch the SystemAgent for a system, if configured. Returns null
 * when the system has no agent row — callers treat null as "use env
 * defaults."
 */
export async function getSystemAgent(systemId: string): Promise<SystemAgentConfig | null> {
  const row = await prisma.systemAgent.findUnique({ where: { systemId } });
  if (!row) return null;

  let toolAllowList: string[] = [];
  try {
    const parsed = JSON.parse(row.toolAllowList);
    if (Array.isArray(parsed)) toolAllowList = parsed.filter(x => typeof x === 'string');
  } catch {
    // Malformed row — degrade to "no tools allowed" rather than
    // leaking the full registry on a parse error.
    toolAllowList = [];
  }

  return {
    id: row.id,
    systemId: row.systemId,
    name: row.name,
    persona: row.persona,
    toolAllowList,
    autonomyTier: coerceAutonomy(row.autonomyTier),
  };
}

/**
 * Filter a requested tool list down to what the agent is allowed to
 * call. Pure function exposed for tests + callers that need to apply
 * scoping without fetching the agent twice.
 */
export function scopeToolsToAgent(
  requestedTools: string[] | undefined,
  agent: SystemAgentConfig | null,
): string[] | undefined {
  if (!agent) return requestedTools; // no agent = no change
  if (!requestedTools) return agent.toolAllowList;
  return requestedTools.filter(t => agent.toolAllowList.includes(t));
}

/**
 * Compose a system prompt with the agent persona prepended. The
 * agent persona is short (role + priorities + tone) and sits before
 * the task-specific instruction so Nova reads "you are X, now do Y."
 */
export function composeSystemPrompt(
  baseInstruction: string,
  agent: SystemAgentConfig | null,
): string {
  if (!agent) return baseInstruction;
  return `You are the ${agent.name}.

${agent.persona}

Autonomy tier: ${agent.autonomyTier}. Only call tools you're explicitly authorised to use.

Task:
${baseInstruction}`;
}
