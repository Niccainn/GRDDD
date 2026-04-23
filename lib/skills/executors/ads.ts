/**
 * Ads-platform executors — Meta / Google / LinkedIn.
 *
 * Meta: real POST of a PAUSED campaign via the Graph API. No spend
 *       happens; user confirms in Meta's UI before flipping active.
 *
 * Google Ads + LinkedIn Ads: the actual campaign-create flows are
 *       multi-step and resource-dependent (you need a budget, a
 *       campaign group, etc. before you can attach a campaign).
 *       Rather than fake artifact URLs, we validate the OAuth
 *       connection and stage a deep link to the provider's
 *       Campaign Manager pre-filled with the user's account id.
 *       The artifact is real — the user finishes the draft there.
 *
 * All three detect a missing integration and fall back with an
 * honest "Connect X" trace message.
 */

import { randomUUID } from 'node:crypto';
import { getMetaAdsClient } from '@/lib/integrations/clients/meta-ads';
import { getGoogleAdsClient } from '@/lib/integrations/clients/google-ads';
import { getLinkedInAdsClient } from '@/lib/integrations/clients/linkedin-ads';
import { resolveIntegration } from './resolve';
import type { Executor } from './types';
import type { Artifact } from '@/lib/projects/types';

type AdInputs = {
  name?: string;
  objective?: string;
  specialAdCategories?: string[];
};

function inferObjective(goal: string, stepTitle: string): string {
  const h = `${goal} ${stepTitle}`.toLowerCase();
  if (/lead|sign[- ]?up|form|waitlist/.test(h)) return 'OUTCOME_LEADS';
  if (/sales|purchase|checkout|conversion|roas/.test(h)) return 'OUTCOME_SALES';
  if (/awareness|brand|reach|impression/.test(h)) return 'OUTCOME_AWARENESS';
  if (/engagement|video|views|likes/.test(h)) return 'OUTCOME_ENGAGEMENT';
  if (/app install|download|mobile app/.test(h)) return 'OUTCOME_APP_PROMOTION';
  return 'OUTCOME_TRAFFIC';
}

export const metaDraftCampaign: Executor = async ({ step, project }) => {
  const now = new Date().toISOString();
  const integration = await resolveIntegration(project.environmentId, 'meta_ads');
  if (!integration) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated Meta Ads: no active Meta Ads integration for this Environment. Connect Meta Ads to stage a paused draft campaign for real.',
        },
      ],
      mode: 'simulated',
    };
  }

  const inputs = (step.inputs ?? {}) as AdInputs;
  const name = inputs.name || step.title || `Campaign · ${project.goal.slice(0, 60)}`;
  const objective = inputs.objective || inferObjective(project.goal, step.title);

  try {
    const client = await getMetaAdsClient(integration.id, project.environmentId);
    const draft = await client.createDraftCampaign({
      name,
      objective,
      specialAdCategories: inputs.specialAdCategories ?? [],
    });

    const artifact: Artifact = {
      id: randomUUID(),
      name: `Meta draft · ${name}`,
      kind: 'campaign',
      tool: 'meta_ads',
      url: draft.manageUrl,
      createdAt: now,
    };

    return {
      step: {
        ...step,
        status: 'done',
        completedAt: now,
        outputs: {
          campaignId: draft.id,
          objective,
          status: 'PAUSED',
          manageUrl: draft.manageUrl,
        },
      },
      artifacts: [artifact],
      trace: [
        {
          stepId: step.id,
          source: 'nova',
          message: `Created PAUSED Meta campaign "${name}" (${objective}). Nothing is running — review in Meta Ads Manager and flip to ACTIVE to start spend.`,
        },
      ],
      mode: 'real',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown Meta error';
    return {
      step: { ...step, status: 'failed', completedAt: now, error: msg },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message: `Meta draft failed: ${msg}. The token or account may need reconnecting, or special_ad_categories may be required for regulated verticals.`,
        },
      ],
      mode: 'real',
    };
  }
};

export const googleAdsDraftCampaign: Executor = async ({ step, project }) => {
  const now = new Date().toISOString();
  const integration = await resolveIntegration(project.environmentId, 'google_ads');
  if (!integration) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated Google Ads: no active Google Ads integration for this Environment. Connect Google Ads to stage a draft campaign for real.',
        },
      ],
      mode: 'simulated',
    };
  }

  // Validate the connection by running a lightweight GAQL query. If
  // that fails, surface the real reason rather than pretend success.
  try {
    const client = await getGoogleAdsClient(integration.id, project.environmentId);
    await client.getAccountTotals('YESTERDAY');

    // accountLabel holds the customer id in "123-456-7890" form.
    const rawCustomer = (integration.accountLabel ?? '').replace(/-/g, '');
    const manageUrl = rawCustomer
      ? `https://ads.google.com/aw/campaigns?ocid=${rawCustomer}`
      : 'https://ads.google.com/aw/campaigns';

    const name = step.title || `Campaign · ${project.goal.slice(0, 60)}`;
    const artifact: Artifact = {
      id: randomUUID(),
      name: `Google Ads · ${name}`,
      kind: 'campaign',
      tool: 'google_ads',
      url: manageUrl,
      createdAt: now,
    };

    return {
      step: {
        ...step,
        status: 'done',
        completedAt: now,
        outputs: {
          mode: 'staged',
          manageUrl,
          note: 'Google Ads campaign creation is multi-step (budget + campaign + ad group). Nova has verified the account connection and deep-linked you to the manager.',
        },
      },
      artifacts: [artifact],
      trace: [
        {
          stepId: step.id,
          source: 'nova',
          message: `Google Ads account verified. Open the manager link to create the campaign (staged mode — multi-step writes live in a later executor pass).`,
        },
      ],
      mode: 'real',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown Google Ads error';
    return {
      step: { ...step, status: 'failed', completedAt: now, error: msg },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message: `Google Ads check failed: ${msg}. The token or developer token may need reconnecting.`,
        },
      ],
      mode: 'real',
    };
  }
};

export const linkedinDraftCampaign: Executor = async ({ step, project }) => {
  const now = new Date().toISOString();
  const integration = await resolveIntegration(project.environmentId, 'linkedin_ads');
  if (!integration) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated LinkedIn Ads: no active LinkedIn Ads integration for this Environment. Connect LinkedIn Ads to stage a draft for real.',
        },
      ],
      mode: 'simulated',
    };
  }

  try {
    const client = await getLinkedInAdsClient(integration.id, project.environmentId);
    const accounts = await client.listAdAccounts();
    if (!accounts || accounts.length === 0) {
      return {
        step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
        artifacts: [],
        trace: [
          {
            stepId: step.id,
            source: 'system',
            message:
              'LinkedIn Ads connected but no ad accounts are accessible. Ask your LinkedIn admin to grant the integration access to an ad account.',
          },
        ],
        mode: 'real',
      };
    }

    const firstAccount = accounts[0];
    const accountId = (firstAccount as { id?: string | number }).id ?? '';
    const manageUrl = accountId
      ? `https://www.linkedin.com/campaignmanager/accounts/${accountId}/campaigns`
      : 'https://www.linkedin.com/campaignmanager';

    const name = step.title || `Campaign · ${project.goal.slice(0, 60)}`;
    const artifact: Artifact = {
      id: randomUUID(),
      name: `LinkedIn Ads · ${name}`,
      kind: 'campaign',
      tool: 'linkedin_ads',
      url: manageUrl,
      createdAt: now,
    };

    return {
      step: {
        ...step,
        status: 'done',
        completedAt: now,
        outputs: {
          mode: 'staged',
          manageUrl,
          accountId,
          note: 'LinkedIn Ads campaign creation requires a Campaign Group and is multi-step. Nova has verified the account and deep-linked you to Campaign Manager.',
        },
      },
      artifacts: [artifact],
      trace: [
        {
          stepId: step.id,
          source: 'nova',
          message: `LinkedIn Ads account verified (${accounts.length} account${accounts.length === 1 ? '' : 's'} accessible). Open Campaign Manager to draft the campaign.`,
        },
      ],
      mode: 'real',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown LinkedIn Ads error';
    return {
      step: { ...step, status: 'failed', completedAt: now, error: msg },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message: `LinkedIn Ads check failed: ${msg}.`,
        },
      ],
      mode: 'real',
    };
  }
};
