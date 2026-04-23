/**
 * Canva real executor — creates a blank design via the Connect API
 * and returns the editor URL so the user can finish the asset.
 *
 * Preset inference:
 *   - step.inputs.preset                            exact match
 *   - else keywords in step title / project goal    heuristic
 *   - else 'social_media_post'                      default
 */

import { randomUUID } from 'node:crypto';
import { getCanvaClient } from '@/lib/integrations/clients/canva';
import { resolveIntegration } from './resolve';
import type { Executor } from './types';
import type { Artifact } from '@/lib/projects/types';

const VALID_PRESETS = new Set([
  'doc',
  'whiteboard',
  'presentation',
  'social_media_post',
  'poster',
  'mobile_video',
  'video',
]);

function pickPreset(inputs: Record<string, unknown> | undefined, stepTitle: string, goal: string): string {
  const explicit = (inputs?.preset as string | undefined)?.toLowerCase();
  if (explicit && VALID_PRESETS.has(explicit)) return explicit;

  const haystack = `${stepTitle} ${goal}`.toLowerCase();
  if (/presentation|deck|slide/.test(haystack)) return 'presentation';
  if (/video|reel|story/.test(haystack)) return 'mobile_video';
  if (/poster|print|flyer/.test(haystack)) return 'poster';
  if (/whiteboard|board|wireframe|map/.test(haystack)) return 'whiteboard';
  if (/doc|document|brief|one-pager|one pager/.test(haystack)) return 'doc';
  return 'social_media_post';
}

export const canvaCreateDesign: Executor = async ({ step, project }) => {
  const now = new Date().toISOString();
  const integration = await resolveIntegration(project.environmentId, 'canva');
  if (!integration) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated Canva: no active Canva integration for this Environment. Connect Canva to spin up a real design.',
        },
      ],
      mode: 'simulated',
    };
  }

  const inputs = (step.inputs ?? {}) as Record<string, unknown>;
  const preset = pickPreset(inputs, step.title, project.goal);
  const title =
    (typeof inputs.title === 'string' && inputs.title) ||
    step.title ||
    `Design · ${project.goal.slice(0, 60)}`;

  try {
    const client = await getCanvaClient(integration.id, project.environmentId);
    const design = await client.createDesign({ preset, title });

    const artifact: Artifact = {
      id: randomUUID(),
      name: `Canva · ${design.title}`,
      kind: 'file',
      tool: 'canva',
      url: design.editUrl,
      thumbnail: null,
      createdAt: now,
    };

    return {
      step: {
        ...step,
        status: 'done',
        completedAt: now,
        outputs: {
          designId: design.id,
          editUrl: design.editUrl,
          viewUrl: design.viewUrl,
          preset,
        },
      },
      artifacts: [artifact],
      trace: [
        {
          stepId: step.id,
          source: 'nova',
          message: `Created a ${preset.replace('_', ' ')} in Canva titled "${design.title}". Open the edit link to finish the asset.`,
        },
      ],
      mode: 'real',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown Canva error';
    return {
      step: { ...step, status: 'failed', completedAt: now, error: msg },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message: `Canva create_design failed: ${msg}. The token may be expired or the preset may not be available to this account.`,
        },
      ],
      mode: 'real',
    };
  }
};
