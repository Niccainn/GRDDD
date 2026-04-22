/**
 * simulated executors — for skills with status `planned` or
 * `partial`. They produce a credible artifact so the user can
 * trace the full flow without the real tool being wired.
 *
 * Every simulated executor is honest: the artifact URL is
 * explicitly a demo link, the trace message labels the mode, and
 * the UI renders simulated artifacts with a distinguishing tag.
 */

import { randomUUID } from 'node:crypto';
import type { Artifact } from '@/lib/projects/types';
import type { Executor, ExecutorResult } from './types';

function simulatedArtifact(
  step: { title: string },
  tool: Artifact['tool'],
  kind: Artifact['kind'],
  displayName: string,
): Artifact {
  return {
    id: randomUUID(),
    name: displayName,
    kind,
    tool,
    url: null, // Honest: no real link until the executor is wired.
    createdAt: new Date().toISOString(),
  };
}

function simulatedResult(
  step: Parameters<Executor>[0]['step'],
  tool: Artifact['tool'],
  kind: Artifact['kind'],
  displayName: string,
  traceMessage: string,
): ExecutorResult {
  const now = new Date().toISOString();
  const artifact = simulatedArtifact(step, tool, kind, displayName);
  return {
    step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
    artifacts: [artifact],
    trace: [{ stepId: step.id, source: 'nova', message: traceMessage }],
    mode: 'simulated',
  };
}

export const figmaCreateFile: Executor = async ({ step, project }) =>
  simulatedResult(
    step,
    'figma',
    'file',
    `${project.goal.slice(0, 40)} — Figma file`,
    'Simulated Figma: created a new file with structured frames. Connect Figma to run this for real.',
  );

export const figmaCreateLogoExplorations: Executor = async ({ step }) =>
  simulatedResult(
    step,
    'figma',
    'file',
    'Brand Explorations · 3 variants',
    'Simulated Figma: produced three logo explorations (monogram, wordmark, geometric) on named frames. Connect Figma to run for real.',
  );

export const figmaExportAsset: Executor = async ({ step }) =>
  simulatedResult(
    step,
    'figma',
    'file',
    'Logo export · PNG + SVG',
    'Simulated Figma: exported the approved frame as PNG + SVG. Connect Figma to run for real.',
  );

export const canvaCreateDesign: Executor = async ({ step, project }) =>
  simulatedResult(
    step,
    'canva',
    'file',
    `${project.goal.slice(0, 40)} — Canva design`,
    'Simulated Canva: produced a static and story-format design from the brand kit. Connect Canva to run for real.',
  );

export const adobeCreateIllustratorFile: Executor = async ({ step, project }) =>
  simulatedResult(
    step,
    'adobe',
    'file',
    `${project.goal.slice(0, 40)} — Illustrator`,
    'Simulated Adobe: created a named .ai file with artboards matching the brief. Connect Adobe to run for real.',
  );

export const metaDraftCampaign: Executor = async ({ step }) =>
  simulatedResult(
    step,
    'meta_ads',
    'campaign',
    'Meta ad campaign · draft',
    'Simulated Meta Ads: drafted a campaign + ad set + creative, un-published. Connect Meta Ads to launch for real.',
  );

export const googleAdsDraftCampaign: Executor = async ({ step }) =>
  simulatedResult(
    step,
    'google_ads',
    'campaign',
    'Google Ads campaign · draft',
    'Simulated Google Ads: drafted search campaign with ad groups + keywords, un-published.',
  );

export const linkedinDraftCampaign: Executor = async ({ step }) =>
  simulatedResult(
    step,
    'linkedin_ads',
    'campaign',
    'LinkedIn ad campaign · draft',
    'Simulated LinkedIn Ads: drafted a campaign with a firmographic audience.',
  );

export const notionCreatePage: Executor = async ({ step, project }) =>
  simulatedResult(
    step,
    'notion',
    'document',
    `${step.title} · Notion page`,
    'Simulated Notion: created page. Connect Notion for real create-page calls.',
  );

export const notionUploadAsset: Executor = async ({ step }) =>
  simulatedResult(
    step,
    'notion',
    'document',
    'Asset filed in Notion library',
    'Simulated Notion: added the artifact to the library. Connect Notion for real uploads.',
  );

export const slackPostMessage: Executor = async ({ step }) =>
  simulatedResult(
    step,
    'slack',
    'post',
    `Slack message · ${step.title}`,
    'Simulated Slack: prepared a message. Connect Slack to post for real.',
  );

export const gmailDraftEmail: Executor = async ({ step }) =>
  simulatedResult(
    step,
    'gmail',
    'email',
    `Gmail draft · ${step.title}`,
    'Simulated Gmail: composed a draft email (not sent). Connect Gmail to save to your drafts folder.',
  );

export const googleDriveSaveFile: Executor = async ({ step }) =>
  simulatedResult(
    step,
    'google_drive',
    'file',
    'File saved to Drive',
    'Simulated Drive: uploaded the artifact.',
  );

export const notionFetchDocument: Executor = async ({ step, project }) => {
  const now = new Date().toISOString();
  return {
    step: {
      ...step,
      status: 'done',
      completedAt: now,
      outputs: {
        simulated: true,
        excerpt:
          `(Simulated) Brief for "${project.goal}": target audience is operators of mid-sized teams; tone is matter-of-fact; visual language is dots, circles, glass.`,
      },
    },
    artifacts: [],
    trace: [
      {
        stepId: step.id,
        source: 'nova',
        message: 'Simulated Notion: read brief from the canonical document. Connect Notion for real fetch.',
      },
    ],
    mode: 'simulated',
  };
};

export const googleCalendarDraftEvent: Executor = async ({ step }) =>
  simulatedResult(
    step,
    'google_calendar',
    'document',
    'Calendar invite draft',
    'Simulated Calendar: drafted an event proposal. Connect Google Calendar to send for real.',
  );
