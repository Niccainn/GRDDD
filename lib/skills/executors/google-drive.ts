/**
 * Google Drive real executor — saves project text content into the
 * user's Drive as a Google Doc by default. Text comes from either
 * step.inputs.content (explicit) or a preceding step's output
 * (excerpt / summary).
 */

import { randomUUID } from 'node:crypto';
import { getGoogleDriveClient } from '@/lib/integrations/clients/google-drive';
import { resolveIntegration } from './resolve';
import type { Executor } from './types';
import type { Artifact } from '@/lib/projects/types';

const PROVIDER_FALLBACKS = ['google_drive', 'gdrive'];

type DriveInputs = {
  name?: string;
  content?: string;
  format?: 'doc' | 'text' | 'markdown';
  parentFolderId?: string;
};

/**
 * Pull the most useful piece of text from previous steps — we prefer
 * an explicit summary, then an excerpt, then raw outputs.text. Keeps
 * the executor composable in longer chains.
 */
function coalesceContent(project: { plan: { outputs?: Record<string, unknown> }[] }): string {
  for (const step of project.plan) {
    const o = step.outputs ?? {};
    for (const key of ['summary', 'excerpt', 'text', 'body']) {
      const v = (o as Record<string, unknown>)[key];
      if (typeof v === 'string' && v.trim().length > 0) return v;
    }
  }
  return '';
}

export const googleDriveSaveFile: Executor = async ({ step, project }) => {
  const now = new Date().toISOString();

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
            'Simulated Google Drive: no active Drive integration for this Environment. Connect Google Drive to save files for real.',
        },
      ],
      mode: 'simulated',
    };
  }

  const inputs = (step.inputs ?? {}) as DriveInputs;
  const content =
    (typeof inputs.content === 'string' && inputs.content.trim()) || coalesceContent(project);
  if (!content) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated Google Drive: step has no content to save, and no preceding step produced a summary or excerpt.',
        },
      ],
      mode: 'simulated',
    };
  }

  const name = inputs.name || step.title || project.goal.slice(0, 80);
  const format = inputs.format ?? 'doc';

  try {
    const client = await getGoogleDriveClient(integration.id, project.environmentId);
    const file = await client.createTextFile({
      name,
      content,
      format,
      parentFolderId: inputs.parentFolderId ?? null,
    });

    const artifact: Artifact = {
      id: randomUUID(),
      name: `Drive · ${name}`,
      kind: 'file',
      tool: 'google_drive',
      url: file.webViewLink,
      createdAt: now,
    };

    return {
      step: {
        ...step,
        status: 'done',
        completedAt: now,
        outputs: { fileId: file.id, url: file.webViewLink, mimeType: file.mimeType },
      },
      artifacts: [artifact],
      trace: [
        {
          stepId: step.id,
          source: 'nova',
          message: `Saved ${content.length} characters to Google Drive as "${name}" (${format === 'doc' ? 'Google Doc' : format}).`,
        },
      ],
      mode: 'real',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown Drive error';
    return {
      step: { ...step, status: 'failed', completedAt: now, error: msg },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message: `Google Drive save failed: ${msg}. Check the integration's scope (drive.file is the minimum for writes).`,
        },
      ],
      mode: 'real',
    };
  }
};
