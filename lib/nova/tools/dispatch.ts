/**
 * Tool dispatcher. Looks up the environment's connected integrations,
 * then resolves + invokes a tool by Claude's `tool_use.name`.
 *
 * Safety:
 *   - Write-side tools only fire when `live === true`. Otherwise we
 *     return a `{ simulated: true, ... }` payload so Claude can still
 *     reason about outcomes without side effects. Reads always run
 *     live when the integration is connected (there's no write risk).
 *   - If a provider isn't connected in this env, every call for that
 *     provider is simulated — the demo never errors, it just shows
 *     "(would have done X, but Slack isn't connected yet)".
 */

import { prisma } from '@/lib/db';
import { TOOLS, type ToolContext, resolveToolByClaudeName } from './registry';
import { INTEGRATION_CATALOG } from '@/lib/integrations/catalog';

export type ToolInvocation = {
  id: string;
  toolId: string;         // e.g. "slack.postMessage"
  claudeName: string;     // e.g. "slack_postMessage"
  provider: string;
  input: Record<string, unknown>;
  result: unknown;
  live: boolean;          // true = real API call; false = simulated
  reason?: string;        // why it was simulated (e.g. "not_connected", "policy_dryrun")
  startedAt: string;
  ms: number;
  error?: string;
};

export async function loadToolContext(environmentId: string): Promise<ToolContext> {
  const integrations = await prisma.integration.findMany({
    where: { environmentId, status: 'CONNECTED' },
    select: { id: true, provider: true },
  });
  const integrationByProvider: Record<string, string> = {};
  for (const i of integrations) integrationByProvider[i.provider] = i.id;
  return { environmentId, integrationByProvider };
}

type DispatchOpts = {
  /** Globally allow write-side tools to fire for real. */
  live: boolean;
};

export async function dispatchTool(
  claudeName: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
  opts: DispatchOpts,
): Promise<ToolInvocation> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const id = `inv_${started}_${Math.random().toString(36).slice(2, 8)}`;
  const match = resolveToolByClaudeName(claudeName);

  if (!match) {
    return {
      id, toolId: claudeName, claudeName, provider: 'unknown',
      input, result: { error: 'unknown_tool' }, live: false,
      reason: 'unknown_tool', startedAt, ms: 0, error: 'unknown_tool',
    };
  }

  const { id: toolId, entry } = match;

  // Meta-tools resolve their real target from input.
  //   integration_list → always runs (no side-effects, no provider gating)
  //   integration_call → resolves provider/method; gating follows the
  //                      underlying method's write flag, not the meta
  //                      tool's placeholder `write: true`.
  let effectiveProvider = entry.provider;
  let effectiveWrite = entry.write;
  let effectiveToolId = toolId;
  if (toolId === 'catalog.list') {
    // Always-safe: inventory query. Run the handler unconditionally.
    try {
      const result = await entry.handler(input, ctx);
      return {
        id, toolId, claudeName, provider: 'catalog',
        input, result, live: true, startedAt, ms: Date.now() - started,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown_error';
      return {
        id, toolId, claudeName, provider: 'catalog',
        input, result: { error: msg }, live: false,
        reason: 'error', startedAt, ms: Date.now() - started, error: msg,
      };
    }
  }
  if (toolId === 'catalog.call') {
    const callProvider = String(input.provider ?? '');
    const callMethod = String(input.method ?? '');
    const catalogEntry = INTEGRATION_CATALOG[callProvider];
    const methodMeta = catalogEntry?.methods.find(m => m.name === callMethod);
    effectiveProvider = callProvider;
    effectiveWrite = methodMeta?.write ?? true; // unknown = treat as write, safe default
    effectiveToolId = `${callProvider}.${callMethod}`;
  }

  const connected = Boolean(ctx.integrationByProvider[effectiveProvider]);
  const shouldSimulate = !connected || (effectiveWrite && !opts.live);
  const reason = !connected
    ? 'not_connected'
    : effectiveWrite && !opts.live
      ? 'policy_dryrun'
      : undefined;

  if (shouldSimulate) {
    return {
      id, toolId: effectiveToolId, claudeName, provider: effectiveProvider,
      input, result: simulatedResult(effectiveToolId, input, reason ?? 'not_connected'),
      live: false, reason, startedAt, ms: Date.now() - started,
    };
  }

  try {
    const result = await entry.handler(input, ctx);
    return {
      id, toolId: effectiveToolId, claudeName, provider: effectiveProvider,
      input, result, live: true, startedAt, ms: Date.now() - started,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown_error';
    return {
      id, toolId: effectiveToolId, claudeName, provider: effectiveProvider,
      input, result: { error: msg }, live: true,
      startedAt, ms: Date.now() - started, error: msg,
    };
  }
}

/**
 * Synthetic result used when a tool would fire but policy or missing
 * integration blocks it. Shape mirrors what the real adapter returns
 * closely enough that Claude can keep reasoning.
 */
function simulatedResult(toolId: string, input: Record<string, unknown>, reason: string): unknown {
  switch (toolId) {
    case 'slack.listChannels':
      return { simulated: true, reason, channels: [
        { id: 'C_SIMULATED_GENERAL', name: 'general' },
        { id: 'C_SIMULATED_ANNOUNCE', name: 'announcements' },
      ] };
    case 'slack.postMessage':
      return {
        simulated: true, reason,
        ts: `sim_${Date.now()}`, channel: input.channelId ?? 'C_SIMULATED',
        preview: `Would post to ${input.channelId}: "${String(input.text ?? '').slice(0, 80)}…"`,
      };
    case 'notion.searchPages':
      return { simulated: true, reason, pages: [
        { id: 'sim_page_1', title: `Simulated: ${input.query ?? ''} result` },
      ] };
    case 'notion.createPage':
      return {
        simulated: true, reason,
        id: `sim_page_${Date.now()}`, url: 'https://notion.so/simulated',
        preview: `Would create page "${input.title}" under ${input.parentPageId}`,
      };
    case 'github.listOpenIssues':
      return { simulated: true, reason, issues: [
        { number: 101, title: `Simulated: issue in ${input.owner}/${input.repo}` },
      ] };
    case 'github.createIssueComment':
      return {
        simulated: true, reason,
        id: `sim_comment_${Date.now()}`,
        preview: `Would comment on ${input.owner}/${input.repo}#${input.issueNumber}`,
      };
    case 'figma.getFile':
      return { simulated: true, reason, name: 'Simulated Figma File', pages: [{ id: '0:1', name: 'Page 1' }] };
    case 'figma.getTextContent':
      return { simulated: true, reason, textNodes: [{ nodeId: '0:2', text: 'Simulated text content.' }] };
    default: {
      // Meta-call path: toolId is "<provider>.<method>". Return a
      // shaped fallback that tells Claude what would have happened
      // without pretending it did.
      const [provider, method] = toolId.split('.');
      return {
        simulated: true, reason,
        preview: `Would call ${method ?? toolId} on ${provider ?? 'integration'} with provided args.`,
      };
    }
  }
}

/** Is the env (or global) configured to let write tools fire live? */
export function isLiveToolsEnabled(): boolean {
  return process.env.NOVA_TOOLS_LIVE === '1';
}

export { TOOLS };
