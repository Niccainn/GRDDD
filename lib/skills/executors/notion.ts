/**
 * Notion real executors.
 *
 * Wraps getNotionClient() from lib/integrations/clients/notion.ts.
 * Falls back to honest simulated output if the Environment does not
 * have an ACTIVE Notion integration.
 *
 * Each executor returns an ExecutorResult with `mode: 'real'` on
 * success so the UI can render the artifact as a first-class link,
 * or `mode: 'simulated'` with a "connect to unlock" trace line if
 * the integration is missing. The rest of the framework
 * (auto-run chain, WhyDrawer, artifact list) handles the display.
 */

import { randomUUID } from 'node:crypto';
import { getNotionClient } from '@/lib/integrations/clients/notion';
import { resolveIntegration } from './resolve';
import type { Executor, ExecutorResult } from './types';
import type { Artifact } from '@/lib/projects/types';

/**
 * Turn natural-language instructions like "Under the 'Projects'
 * database, titled 'Q4 launch brief'" into the { parentPageId, title }
 * the Notion client needs. For now: require caller-supplied inputs;
 * fall back to the environment's first accessible root page.
 */
async function resolveParent(
  client: Awaited<ReturnType<typeof getNotionClient>>,
  suggestedTitle: string,
): Promise<string | null> {
  // Best-effort: search for a page called "GRID Projects" that the
  // integration has access to; if not found, use any recent page.
  const searchTerms = ['GRID Projects', 'Projects', 'Workspace'];
  for (const term of searchTerms) {
    try {
      const results = await client.searchPages(term, 3);
      if (results.length > 0) return results[0].id;
    } catch {
      /* try next */
    }
  }
  // Last resort — let Notion pick the default parent. The API
  // requires a parent, so if nothing matches return null and the
  // executor will fall back to simulated mode with a helpful note.
  return null;
}

function simulatedFallback(
  stepTitle: string,
  reason: string,
): ExecutorResult {
  const now = new Date().toISOString();
  return {
    step: { title: stepTitle, status: 'done' } as never, // updated by caller
    artifacts: [],
    trace: [
      {
        stepId: 0,
        source: 'system',
        message: `Notion executor fell back to simulated mode — ${reason}`,
      },
    ],
    mode: 'simulated',
  };
}

export const notionCreatePage: Executor = async ({ step, project }) => {
  const now = new Date().toISOString();
  const integration = await resolveIntegration(project.environmentId, 'notion');
  if (!integration) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated Notion: no active Notion integration for this Environment. Connect Notion to run this for real.',
        },
      ],
      mode: 'simulated',
    };
  }

  try {
    const client = await getNotionClient(integration.id, project.environmentId);
    const parentPageId = await resolveParent(client, step.title);
    if (!parentPageId) {
      return {
        step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
        artifacts: [],
        trace: [
          {
            stepId: step.id,
            source: 'system',
            message:
              'Simulated Notion: integration is connected but no accessible root page was found. Share a "GRID Projects" or "Projects" page with the integration and retry.',
          },
        ],
        mode: 'simulated',
      };
    }

    // Compose a minimal body. If the user has taught us a Monday-
    // morning voice in NovaMemory, Nova would preload that here; for
    // now we ship the rationale + goal as the opening paragraph.
    const body = [
      step.rationale,
      '',
      `Part of project: ${project.goal}`,
      `Started: ${new Date(project.createdAt).toLocaleString()}`,
    ].join('\n');

    const result = await client.createPage({
      parentPageId,
      title: step.title.slice(0, 200),
      body,
    });

    const artifact: Artifact = {
      id: randomUUID(),
      name: step.title,
      kind: 'document',
      tool: 'notion',
      url: result.url,
      createdAt: now,
    };

    return {
      step: {
        ...step,
        status: 'done',
        completedAt: now,
        outputs: { notionPageId: result.id, url: result.url },
      },
      artifacts: [artifact],
      trace: [
        {
          stepId: step.id,
          source: 'nova',
          message: `Created Notion page: ${step.title}. Link in artifact list.`,
        },
      ],
      mode: 'real',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown Notion error';
    return {
      step: { ...step, status: 'failed', completedAt: now, error: msg },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message: `Notion create_page failed: ${msg}. The integration is connected but the call errored — check the permissions on the parent page.`,
        },
      ],
      mode: 'real',
    };
  }
};
