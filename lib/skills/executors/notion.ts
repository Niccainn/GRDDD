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

/**
 * notion.fetch_document — search Notion for the most relevant page
 * and pull its text excerpt. The excerpt is stored on the step's
 * outputs so downstream steps (e.g. claude.summarize) can use it
 * via the auto-run chain.
 */
export const notionFetchDocument: Executor = async ({ step, project }) => {
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
            'Simulated Notion fetch: no active Notion integration for this Environment. Connect Notion to pull a real brief.',
        },
      ],
      mode: 'simulated',
    };
  }

  // Choose the search query: prefer an explicit step.inputs.query,
  // otherwise use the step title, otherwise the project goal's head.
  const inputs = (step.inputs ?? {}) as { query?: string; pageId?: string };
  const query = inputs.query?.trim() || step.title || project.goal.slice(0, 80);

  try {
    const client = await getNotionClient(integration.id, project.environmentId);

    // If the step carries an explicit pageId, fetch directly.
    let pageId = inputs.pageId ?? null;
    if (!pageId) {
      const hits = await client.searchPages(query, 3);
      if (hits.length === 0) {
        return {
          step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
          artifacts: [],
          trace: [
            {
              stepId: step.id,
              source: 'system',
              message: `Simulated Notion fetch: no pages matched "${query}". Share a relevant page with the integration and retry.`,
            },
          ],
          mode: 'simulated',
        };
      }
      pageId = hits[0].id;
    }

    const page = await client.fetchPage({ pageId });
    const artifact: Artifact = {
      id: randomUUID(),
      name: `Notion · ${page.title}`,
      kind: 'document',
      tool: 'notion',
      url: page.url,
      createdAt: now,
    };

    return {
      step: {
        ...step,
        status: 'done',
        completedAt: now,
        outputs: {
          notionPageId: page.id,
          url: page.url,
          title: page.title,
          excerpt: page.excerpt,
          blockCount: page.blockCount,
        },
      },
      artifacts: [artifact],
      trace: [
        {
          stepId: step.id,
          source: 'nova',
          message: `Fetched "${page.title}" from Notion (${page.blockCount} blocks). Downstream steps will use this as context.`,
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
          message: `Notion fetch_document failed: ${msg}. The integration is connected but the call errored.`,
        },
      ],
      mode: 'real',
    };
  }
};

/**
 * notion.upload_asset — attach a prior-step artifact (image, file,
 * or link) to a Notion page as an image/file/embed block referencing
 * the external URL. True file uploads require Notion's File Uploads
 * endpoint which is scoped behind a per-workspace toggle — external
 * URL attach works for any integration and is zero-spend.
 *
 * Inputs resolution:
 *   - step.inputs.url           explicit URL to attach
 *   - step.inputs.pageId        target Notion page (else Nova searches)
 *   - step.inputs.caption       optional caption for the block
 *   - otherwise: grab the most recent artifact URL from prior steps
 */
export const notionUploadAsset: Executor = async ({ step, project }) => {
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
            'Simulated Notion upload: no active Notion integration for this Environment. Connect Notion to attach the asset for real.',
        },
      ],
      mode: 'simulated',
    };
  }

  const inputs = (step.inputs ?? {}) as {
    url?: string;
    pageId?: string;
    caption?: string;
    kind?: 'image' | 'file' | 'embed' | 'bookmark';
  };

  // Pull the most recent prior artifact URL if no explicit url given.
  let url = inputs.url?.trim();
  let sourceArtifactName: string | null = null;
  if (!url) {
    const recent = [...project.artifacts].reverse().find(a => typeof a.url === 'string' && a.url);
    if (recent) {
      url = recent.url ?? undefined;
      sourceArtifactName = recent.name;
    }
  }
  if (!url) {
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
      artifacts: [],
      trace: [
        {
          stepId: step.id,
          source: 'system',
          message:
            'Simulated Notion upload: nothing to attach — no step.inputs.url and no prior artifact with a URL.',
        },
      ],
      mode: 'simulated',
    };
  }

  // Infer the block kind from the URL if not specified.
  const kind: 'image' | 'file' | 'embed' | 'bookmark' =
    inputs.kind ??
    (/\.(png|jpe?g|gif|svg|webp|avif)(?:\?|$)/i.test(url)
      ? 'image'
      : /\.(pdf|zip|mp4|mov|mp3|wav)(?:\?|$)/i.test(url)
      ? 'file'
      : /figma\.com|youtube\.com|loom\.com|drive\.google\.com\/file/i.test(url)
      ? 'embed'
      : 'bookmark');

  try {
    const client = await getNotionClient(integration.id, project.environmentId);

    let pageId = inputs.pageId ?? null;
    if (!pageId) {
      const terms = ['GRID Assets', 'Assets', 'GRID Projects', 'Projects'];
      for (const term of terms) {
        try {
          const hits = await client.searchPages(term, 3);
          if (hits.length > 0) {
            pageId = hits[0].id;
            break;
          }
        } catch {
          /* try next */
        }
      }
    }
    if (!pageId) {
      return {
        step: { ...step, status: 'done', completedAt: now, outputs: { simulated: true } },
        artifacts: [],
        trace: [
          {
            stepId: step.id,
            source: 'system',
            message:
              'Simulated Notion upload: no target page — share a "GRID Assets" or "Assets" page with the integration and retry.',
          },
        ],
        mode: 'simulated',
      };
    }

    const caption =
      inputs.caption ??
      (sourceArtifactName
        ? `${sourceArtifactName} — attached by Nova for "${project.goal.slice(0, 60)}"`
        : `Attached by Nova for "${project.goal.slice(0, 60)}"`);

    await client.appendBlocks({
      pageId,
      blocks: [{ type: kind, url, caption }],
    });

    const artifact: Artifact = {
      id: randomUUID(),
      name: `Notion attach · ${kind}`,
      kind: 'document',
      tool: 'notion',
      url: `https://www.notion.so/${pageId.replace(/-/g, '')}`,
      createdAt: now,
    };

    return {
      step: {
        ...step,
        status: 'done',
        completedAt: now,
        outputs: {
          pageId,
          url,
          kind,
          sourceArtifactName,
        },
      },
      artifacts: [artifact],
      trace: [
        {
          stepId: step.id,
          source: 'nova',
          message: `Attached the prior artifact to Notion as an ${kind} block. ${sourceArtifactName ? `Source: ${sourceArtifactName}.` : ''}`,
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
          message: `Notion upload_asset failed: ${msg}.`,
        },
      ],
      mode: 'real',
    };
  }
};

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
