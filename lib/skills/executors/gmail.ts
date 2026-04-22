/**
 * Gmail real executors.
 *
 * Wraps getGoogleWorkspaceClient().gmailCreateDraft(). This is the
 * "draft, never send" executor — matches how marketers and ops
 * teams actually want their AI to operate around email. The user
 * reviews in their own Gmail drafts folder and hits Send
 * themselves.
 *
 * Provider slug preference: tries 'google_workspace' first, then
 * 'gmail' and 'google' as fallbacks, since onboarding copy refers
 * to "Gmail" but the underlying integration is the wider Google
 * Workspace scope.
 */

import { randomUUID } from 'node:crypto';
import { getGoogleWorkspaceClient } from '@/lib/integrations/clients/google-workspace';
import { resolveIntegration } from './resolve';
import type { Executor, ExecutorResult } from './types';
import type { Artifact } from '@/lib/projects/types';

const PROVIDER_FALLBACKS = ['google_workspace', 'gmail', 'google'];

function parseToFromInputs(inputs: unknown): string {
  if (!inputs || typeof inputs !== 'object') return '';
  const anyInputs = inputs as Record<string, unknown>;
  for (const key of ['to', 'recipient', 'email']) {
    if (typeof anyInputs[key] === 'string') return anyInputs[key] as string;
  }
  return '';
}

function composeBody(
  stepTitle: string,
  stepRationale: string,
  goal: string,
): string {
  return [
    stepRationale,
    '',
    '---',
    `Context: this email was drafted as part of "${goal}".`,
    `You are reviewing in your own Gmail drafts folder. Edit freely before sending.`,
  ].join('\n');
}

export const gmailDraftEmail: Executor = async ({ step, project }) => {
  const now = new Date().toISOString();

  // Find the first provider slug that has an active integration.
  let integration = null;
  for (const provider of PROVIDER_FALLBACKS) {
    integration = await resolveIntegration(project.environmentId, provider);
    if (integration) break;
  }

  if (!integration) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated Gmail: no active Google Workspace integration for this Environment. Connect Google Workspace to draft for real.',
        },
      ],
      mode: 'simulated',
    };
  }

  // Recipient resolution. If the step didn't carry an explicit
  // inputs.to, we can't safely draft to a guess — fall back to
  // simulated mode with a helpful trace.
  const to = parseToFromInputs(step.inputs);
  if (!to) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated Gmail: integration is connected, but this step has no recipient (step.inputs.to). Edit the step and try again, or teach Nova where "draft email" should default.',
        },
      ],
      mode: 'simulated',
    };
  }

  try {
    const client = await getGoogleWorkspaceClient(integration.id, project.environmentId);
    const subject = step.title.slice(0, 200);
    const body = composeBody(step.title, step.rationale, project.goal);
    const draft = await client.gmailCreateDraft({ to, subject, body });

    const artifact: Artifact = {
      id: randomUUID(),
      name: `Gmail draft · ${subject}`,
      kind: 'email',
      tool: 'gmail',
      url: draft.url, // deep-link to the drafts folder
      createdAt: now,
    };

    return {
      step: {
        ...step,
        status: 'done',
        completedAt: now,
        outputs: { draftId: draft.id, to, subject },
      },
      artifacts: [artifact],
      trace: [
        {
          stepId: step.id,
          source: 'nova',
          message: `Drafted Gmail to ${to}. Open your drafts folder to review and send.`,
        },
      ],
      mode: 'real',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown Gmail error';
    return {
      step: { ...step, status: 'failed', completedAt: now, error: msg },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message: `Gmail draft create failed: ${msg}.`,
        },
      ],
      mode: 'real',
    };
  }
};
