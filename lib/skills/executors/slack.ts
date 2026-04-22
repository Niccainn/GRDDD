/**
 * Slack real executors.
 *
 * Wraps getSlackClient().postMessage(). Falls back to simulated
 * mode with an honest trace if the Slack integration is missing.
 *
 * Channel resolution: caller may pass step.inputs.channel (an id or
 * #name). If absent, we try the first channel the bot is a member
 * of whose name looks like a canonical ops channel (notifications,
 * grid, general). Failing that, we fall back to simulated mode
 * rather than posting to an arbitrary channel.
 */

import { randomUUID } from 'node:crypto';
import { getSlackClient } from '@/lib/integrations/clients/slack';
import { resolveIntegration } from './resolve';
import type { Executor, ExecutorResult } from './types';
import type { Artifact } from '@/lib/projects/types';

const CANONICAL_CHANNEL_HINTS = ['grid', 'notifications', 'nova', 'project-updates', 'general'];

async function pickChannel(
  client: Awaited<ReturnType<typeof getSlackClient>>,
  preferred?: string,
): Promise<{ id: string; name: string } | null> {
  const channels = await client.listChannels(200);
  if (preferred) {
    // Accept #name, name, or a bare channel id.
    const clean = preferred.replace(/^#/, '').toLowerCase();
    const match =
      channels.find(c => c.id === preferred) ||
      channels.find(c => c.name.toLowerCase() === clean);
    if (match) return { id: match.id, name: match.name };
  }
  for (const hint of CANONICAL_CHANNEL_HINTS) {
    const match = channels.find(c => c.isMember && c.name.toLowerCase().includes(hint));
    if (match) return { id: match.id, name: match.name };
  }
  // First channel the bot is in, if any.
  const firstMember = channels.find(c => c.isMember);
  return firstMember ? { id: firstMember.id, name: firstMember.name } : null;
}

function composeMessage(step: { title: string; rationale: string }, goal: string): string {
  return [
    `*${step.title}*`,
    step.rationale,
    '',
    `Project goal: ${goal}`,
  ].join('\n');
}

export const slackPostMessage: Executor = async ({ step, project }) => {
  const now = new Date().toISOString();
  const integration = await resolveIntegration(project.environmentId, 'slack');
  if (!integration) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated Slack: no active Slack integration for this Environment. Connect Slack to post for real.',
        },
      ],
      mode: 'simulated',
    };
  }

  try {
    const client = await getSlackClient(integration.id, project.environmentId);
    const preferred = (step.inputs?.channel as string | undefined) ?? undefined;
    const channel = await pickChannel(client, preferred);
    if (!channel) {
      return {
        step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
        artifacts: [],
        trace: [
          {
            stepId: step.id,
            source: 'system',
            message:
              'Simulated Slack: integration is connected but the bot is not a member of any channel yet. Invite @GRID to a channel (e.g. #grid-updates) and retry.',
          },
        ],
        mode: 'simulated',
      };
    }

    const text = composeMessage(step, project.goal);
    const posted = await client.postMessage(channel.id, text);

    const artifact: Artifact = {
      id: randomUUID(),
      name: `Slack message · #${channel.name}`,
      kind: 'post',
      tool: 'slack',
      // Slack's deep-link pattern — workspace URL not known here,
      // so render a message locator the user can navigate with the
      // channel-name already in the label.
      url: null,
      createdAt: now,
    };

    return {
      step: {
        ...step,
        status: 'done',
        completedAt: now,
        outputs: { channel: channel.name, ts: posted.ts },
      },
      artifacts: [artifact],
      trace: [
        {
          stepId: step.id,
          source: 'nova',
          message: `Posted to Slack #${channel.name}.`,
        },
      ],
      mode: 'real',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown Slack error';
    return {
      step: { ...step, status: 'failed', completedAt: now, error: msg },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message: `Slack post_message failed: ${msg}.`,
        },
      ],
      mode: 'real',
    };
  }
};
