/**
 * GET /api/onboarding/scaffold/stream?description=...
 *
 * SSE variant of /api/onboarding/scaffold. Emits narration events
 * while Nova plans + we create rows, then a final "done" event
 * with the ids the client needs to redirect.
 *
 * Events:
 *   data: {"type":"step","text":"Designing your Systems…"}
 *   data: {"type":"done","environmentId":"…","systemIds":[…]}
 *   data: {"type":"error","message":"…"}
 *
 * Uses GET so EventSource can consume it; the description goes
 * in the query string. Clients with descriptions longer than
 * ~1800 chars should fall back to the synchronous POST variant.
 */
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitNovaStrict } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { getAnthropicClientForEnvironment } from '@/lib/nova/client-factory';
import {
  SCAFFOLD_SYSTEM_PROMPT,
  buildScaffoldUserMessage,
} from '@/lib/onboarding/scaffold-prompt';
import type {
  EnvironmentScaffold,
  ScaffoldSystem,
} from '@/lib/onboarding/scaffold-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCAFFOLD_MODEL = 'claude-sonnet-4-6';
const MAX_DESCRIPTION = 2000;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48) || 'workspace';
}

function isValidScaffold(x: unknown): x is EnvironmentScaffold {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.environmentName === 'string' &&
    Array.isArray(o.systems) &&
    Array.isArray(o.canvases)
  );
}

async function ensureDefaultEnvironment(identityId: string, name: string | null) {
  const existing = await prisma.environment.findFirst({
    where: { ownerId: identityId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing;
  const baseName = name || 'My Workspace';
  const baseSlug = slugify(baseName);
  let slug = baseSlug;
  for (let i = 0; i < 5; i++) {
    const taken = await prisma.environment.findUnique({ where: { slug } });
    if (!taken) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return prisma.environment.create({
    data: { name: baseName, slug, ownerId: identityId },
  });
}

export async function GET(req: Request) {
  const identity = await getAuthIdentity();
  const rl = await rateLimitNovaStrict(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { searchParams } = new URL(req.url);
  const description = String(searchParams.get('description') ?? '').slice(0, MAX_DESCRIPTION);
  if (description.trim().length < 10) {
    return Response.json(
      { error: 'Please describe your work in a sentence or two.' },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      const step = async (text: string, ms = 500) => {
        send({ type: 'step', text });
        await new Promise(r => setTimeout(r, ms));
      };

      try {
        await step('Reading your description', 300);

        const env = await ensureDefaultEnvironment(identity.id, identity.name ?? null);
        await step('Opening your Environment', 300);
        await step('Designing the right Systems…', 500);

        // LLM call — Nova plans the scaffold.
        const { client } = await getAnthropicClientForEnvironment(env.id);
        const msg = await client.messages.create({
          model: SCAFFOLD_MODEL,
          max_tokens: 4096,
          system: SCAFFOLD_SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: buildScaffoldUserMessage(description) },
          ],
        });
        const first = msg.content[0];
        const text = first && first.type === 'text' ? first.text : '';
        const clean = text
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        const parsed = JSON.parse(clean);
        if (!isValidScaffold(parsed)) throw new Error('Scaffold shape invalid');
        const scaffold: EnvironmentScaffold = parsed;

        await step(`Creating ${scaffold.systems.length} Systems`, 300);

        // Persist Systems + Workflows, streaming a line per System.
        const slugToId: Record<string, string> = {};
        for (const sys of scaffold.systems as ScaffoldSystem[]) {
          const created = await prisma.system.create({
            data: {
              name: sys.name,
              description: sys.description,
              color: sys.color,
              environmentId: env.id,
              creatorId: identity.id,
              config: JSON.stringify({ slug: sys.slug, scaffold: true }),
            },
          });
          slugToId[sys.slug] = created.id;
          for (const wf of sys.workflows) {
            await prisma.workflow.create({
              data: {
                name: wf.name,
                status: 'draft',
                systemId: created.id,
                environmentId: env.id,
                creatorId: identity.id,
                stages: JSON.stringify(
                  wf.stages.map((s, i) => ({ id: `stage-${i}`, name: s, order: i })),
                ),
              },
            });
          }
          await step(`  · ${sys.name}`, 250);
        }

        // Persist canvases — names + widget specs (slug-resolved).
        if (scaffold.canvases.length > 0) {
          await step('Laying out your canvases', 300);
          let position = 0;
          for (const canvas of scaffold.canvases) {
            const widgets = (canvas.widgets ?? []).map((w, i) => ({
              id: `w_${Math.random().toString(36).slice(2, 10)}`,
              kind: w.kind,
              size: w.size,
              title: w.title,
              source:
                w.source.type === 'system'
                  ? { type: 'system', id: slugToId[w.source.systemSlug] ?? w.source.systemSlug }
                  : w.source,
              refresh: { mode: 'interval', seconds: 60 },
              origin: 'user',
              createdAt: new Date().toISOString(),
              __position: w.position ?? { x: (i * 2) % 4, y: Math.floor((i * 2) / 4) * 2, w: 2, h: 2 },
            }));
            const layoutMap: Record<string, { x: number; y: number; w: number; h: number }> = {};
            for (const w of widgets) layoutMap[w.id] = w.__position;
            await prisma.canvas.create({
              data: {
                name: canvas.name,
                environmentId: env.id,
                ownerId: identity.id,
                widgets: JSON.stringify(widgets.map(({ __position: _, ...rest }) => rest)),
                layout: JSON.stringify(layoutMap),
                position: position++,
              },
            });
            await step(`  · ${canvas.name}`, 200);
          }
        }

        await prisma.identity.update({
          where: { id: identity.id },
          data: { onboardedAt: new Date() },
        });

        send({
          type: 'done',
          environmentId: env.id,
          systemIds: Object.values(slugToId),
          scaffold,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Scaffold failed';
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
