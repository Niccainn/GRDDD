/**
 * Figma real executors.
 *
 * Figma's public REST API does not expose file creation — that only
 * happens through the web UI or a plugin. We do what is honest:
 *
 *   - Validate the OAuth token against /v1/me so we know the
 *     connection is live.
 *   - Generate a "new file" deep link with a pre-filled title.
 *   - For logo explorations, attach a Nova-drafted brief to the
 *     trace so the user opens Figma with the frame explicitly named.
 *   - For export, use the real /v1/images endpoint against a file the
 *     user already has (step.inputs.fileKey + nodeIds required).
 *
 * This is the "stage, don't fake" pattern: the user is handed a
 * working entry point with the right context, rather than a fake
 * artifact URL.
 */

import { randomUUID } from 'node:crypto';
import { getFigmaClient } from '@/lib/integrations/clients/figma';
import { resolveIntegration } from './resolve';
import type { Executor } from './types';
import type { Artifact } from '@/lib/projects/types';

const FIGMA_NEW_FILE_URL = 'https://www.figma.com/files/new';

/**
 * Validate the Figma token is still good by calling /v1/me. We don't
 * care about the response body, just that it didn't 401/403. Returns
 * true on success, false on any auth error.
 */
async function validateFigma(integrationId: string, environmentId: string): Promise<{ ok: true; handle: string } | { ok: false; reason: string }> {
  try {
    const client = await getFigmaClient(integrationId, environmentId);
    // listFiles() with no args calls /me — cheap and safe.
    const res = await client.listFiles();
    const handle = res.files[0]?.name ?? 'connected';
    return { ok: true, handle };
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Unknown Figma error';
    return { ok: false, reason };
  }
}

/**
 * Pre-filled "new file" URL. Figma doesn't support query-param
 * seeding, but the URL still lands in a fresh editor — we just put
 * the intended name in the trace so the user types it once.
 */
function newFileUrl(): string {
  return FIGMA_NEW_FILE_URL;
}

export const figmaCreateFile: Executor = async ({ step, project }) => {
  const now = new Date().toISOString();
  const integration = await resolveIntegration(project.environmentId, 'figma');
  if (!integration) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated Figma: no active Figma integration for this Environment. Connect Figma so Nova can validate access when it stages a file.',
        },
      ],
      mode: 'simulated',
    };
  }

  const check = await validateFigma(integration.id, project.environmentId);
  if (!check.ok) {
    return {
      step: { ...step, status: 'failed', completedAt: now, error: check.reason },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message: `Figma token check failed: ${check.reason}. Reconnect the Figma integration.`,
        },
      ],
      mode: 'real',
    };
  }

  const fileName = step.title || `Design · ${project.goal.slice(0, 60)}`;
  const artifact: Artifact = {
    id: randomUUID(),
    name: `Figma · ${fileName}`,
    kind: 'file',
    tool: 'figma',
    url: newFileUrl(),
    createdAt: now,
  };

  return {
    step: {
      ...step,
      status: 'done',
      completedAt: now,
      outputs: {
        mode: 'staged',
        suggestedName: fileName,
        url: newFileUrl(),
        note: 'Figma REST does not support server-side file creation; this stages an entry point.',
      },
    },
    artifacts: [artifact],
    trace: [
      {
        stepId: step.id,
        source: 'nova',
        message: `Figma connection verified (${check.handle}). Open the link in the artifact list and name the new file "${fileName}".`,
      },
    ],
    mode: 'real',
  };
};

export const figmaCreateLogoExplorations: Executor = async ({ step, project }) => {
  const now = new Date().toISOString();
  const integration = await resolveIntegration(project.environmentId, 'figma');
  if (!integration) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated Figma: no active Figma integration. Connect Figma so Nova can verify access and attach a brief.',
        },
      ],
      mode: 'simulated',
    };
  }

  const check = await validateFigma(integration.id, project.environmentId);
  if (!check.ok) {
    return {
      step: { ...step, status: 'failed', completedAt: now, error: check.reason },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message: `Figma token check failed: ${check.reason}. Reconnect the Figma integration.`,
        },
      ],
      mode: 'real',
    };
  }

  const name = step.title || `Logo explorations · ${project.goal.slice(0, 60)}`;
  // Compose a brief the user can paste straight into the first frame.
  const brief = [
    `Project goal: ${project.goal}`,
    '',
    'Frame 1 — Wordmark exploration (typography-led, no icon).',
    'Frame 2 — Mark-led (simple symbol, works at 24px).',
    'Frame 3 — Hybrid (wordmark + mark, stacked + horizontal lockups).',
    '',
    'Each frame should include: primary, inverted, monochrome, and a 24×24 usage test.',
  ].join('\n');
  const artifact: Artifact = {
    id: randomUUID(),
    name: `Figma brief · ${name}`,
    kind: 'file',
    tool: 'figma',
    url: newFileUrl(),
    createdAt: now,
  };

  return {
    step: {
      ...step,
      status: 'done',
      completedAt: now,
      outputs: { mode: 'staged', suggestedName: name, url: newFileUrl(), brief },
    },
    artifacts: [artifact],
    trace: [
      {
        stepId: step.id,
        source: 'nova',
        message: `Figma connection verified. Open the link, name the file "${name}", and paste the three-frame brief Nova drafted (in step outputs).`,
      },
    ],
    mode: 'real',
  };
};

export const figmaExportAsset: Executor = async ({ step, project }) => {
  const now = new Date().toISOString();
  const integration = await resolveIntegration(project.environmentId, 'figma');
  if (!integration) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated Figma: no active Figma integration. Connect Figma to export assets for real.',
        },
      ],
      mode: 'simulated',
    };
  }

  const inputs = (step.inputs ?? {}) as {
    fileKey?: string;
    nodeIds?: string[] | string;
    format?: 'png' | 'svg';
  };
  const fileKey = inputs.fileKey;
  const nodeIds = Array.isArray(inputs.nodeIds)
    ? inputs.nodeIds
    : typeof inputs.nodeIds === 'string'
    ? inputs.nodeIds.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const format: 'png' | 'svg' = inputs.format === 'svg' ? 'svg' : 'png';

  if (!fileKey || nodeIds.length === 0) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated Figma export: step is missing fileKey and nodeIds. Provide them in step.inputs to export for real.',
        },
      ],
      mode: 'simulated',
    };
  }

  try {
    const client = await getFigmaClient(integration.id, project.environmentId);
    const { images } = await client.getImages(fileKey, nodeIds, format);

    const artifacts: Artifact[] = Object.entries(images)
      .filter(([, url]) => typeof url === 'string' && url.length > 0)
      .map(([nodeId, url]) => ({
        id: randomUUID(),
        name: `Export · ${nodeId}.${format}`,
        kind: 'file',
        tool: 'figma',
        url: url as string,
        createdAt: now,
      }));

    return {
      step: {
        ...step,
        status: 'done',
        completedAt: now,
        outputs: { fileKey, nodeIds, format, images },
      },
      artifacts,
      trace: [
        {
          stepId: step.id,
          source: 'nova',
          message: `Exported ${artifacts.length} asset${artifacts.length === 1 ? '' : 's'} from Figma (${format.toUpperCase()}).`,
        },
      ],
      mode: 'real',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown Figma error';
    return {
      step: { ...step, status: 'failed', completedAt: now, error: msg },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message: `Figma export failed: ${msg}. Check the fileKey and nodeIds.`,
        },
      ],
      mode: 'real',
    };
  }
};
