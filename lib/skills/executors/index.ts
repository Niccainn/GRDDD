/**
 * Executor dispatch — maps a Step.action (skill id) to the
 * implementation that actually runs it.
 *
 * The API route calls `execute(step, project)`; this file decides
 * whether the step runs as real integration, reasoning-only, or
 * simulated. Adding a new skill executor is a one-line change here.
 */

import type { Step, Project } from '@/lib/projects/types';
import type { ExecutorResult } from './types';
import * as claudeExec from './claude';
import * as simExec from './simulated';
import { humanReview } from './human';
import { notionCreatePage as realNotionCreatePage, notionFetchDocument as realNotionFetchDocument } from './notion';
import { slackPostMessage as realSlackPostMessage } from './slack';
import { gmailDraftEmail as realGmailDraftEmail } from './gmail';
import { googleCalendarDraftEvent as realGcalDraftEvent } from './google-calendar';
import { googleDriveSaveFile as realGoogleDriveSaveFile } from './google-drive';
import {
  figmaCreateFile as realFigmaCreateFile,
  figmaCreateLogoExplorations as realFigmaCreateLogoExplorations,
  figmaExportAsset as realFigmaExportAsset,
} from './figma';

type Executor = (args: { step: Step; project: Project }) => Promise<ExecutorResult>;

const DISPATCH: Record<string, Executor> = {
  // Reasoning-only — real Claude calls.
  'claude.summarize': claudeExec.summarize,
  'claude.draft_copy': claudeExec.draftCopy,

  // Simulated until the integration executors are wired.
  'canva.create_design': simExec.canvaCreateDesign,
  'adobe.create_illustrator_file': simExec.adobeCreateIllustratorFile,
  'meta_ads.draft_campaign': simExec.metaDraftCampaign,
  'google_ads.draft_campaign': simExec.googleAdsDraftCampaign,
  'linkedin_ads.draft_campaign': simExec.linkedinDraftCampaign,
  // Real — call the provider API if the integration is connected,
  // gracefully fall back to simulated mode otherwise.
  'notion.create_page': realNotionCreatePage,
  'notion.fetch_document': realNotionFetchDocument,
  'slack.post_message': realSlackPostMessage,
  'gmail.draft_email': realGmailDraftEmail,
  'google_calendar.draft_event': realGcalDraftEvent,
  'google_drive.save_file': realGoogleDriveSaveFile,
  // Figma — REST does not expose file creation, so create_file /
  // create_logo_explorations validate the token and stage a pre-
  // filled entry point. export_asset is a real API call.
  'figma.create_file': realFigmaCreateFile,
  'figma.create_logo_explorations': realFigmaCreateLogoExplorations,
  'figma.export_asset': realFigmaExportAsset,
  // Still simulated until wired against the matching write path in
  // the client library.
  'notion.upload_asset': simExec.notionUploadAsset,

  // Human-only.
  'human.review': humanReview,
};

export async function execute(step: Step, project: Project): Promise<ExecutorResult> {
  const executor = DISPATCH[step.action];
  if (!executor) {
    const now = new Date().toISOString();
    return {
      step: {
        ...step,
        status: 'skipped',
        completedAt: now,
        error: `No executor wired for action "${step.action}".`,
      },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message: `Skipped — no executor registered for ${step.action}.`,
        },
      ],
      mode: 'simulated',
    };
  }
  try {
    return await executor({ step, project });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown executor error';
    const now = new Date().toISOString();
    return {
      step: { ...step, status: 'failed', completedAt: now, error: message },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message: `Executor failed: ${message}`,
        },
      ],
      mode: 'simulated',
    };
  }
}

/**
 * Should this step run automatically when the project reaches it?
 * Human gates and approval-required steps do NOT auto-run; they
 * wait for the user's action.
 */
export function isAutoRunnable(step: Step): boolean {
  if (step.tool === 'human') return false;
  if (step.approval?.required && step.status !== 'running') return false;
  return true;
}
