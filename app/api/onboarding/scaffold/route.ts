/**
 * POST /api/onboarding/scaffold
 *
 * Body: { description: string }
 *
 * Calls Claude with SCAFFOLD_SYSTEM_PROMPT, parses the returned
 * JSON, validates the shape, and creates Systems + Workflows +
 * Canvas layout in one transaction. Returns the created ids and
 * the full scaffold so the client can redirect into the first
 * Canvas.
 *
 * Requires an authenticated session. The call goes against the
 * user's default Environment (or creates one if they have none).
 */
import { getAuthIdentity } from '@/lib/auth';
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
  if (typeof o.environmentName !== 'string') return false;
  if (!Array.isArray(o.systems)) return false;
  if (!Array.isArray(o.canvases)) return false;
  return true;
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

export async function POST(req: Request) {
  const identity = await getAuthIdentity();
  const body = await req.json().catch(() => ({}));
  const description = String(body?.description ?? '').slice(0, MAX_DESCRIPTION);
  if (description.trim().length < 10) {
    return Response.json(
      { error: 'Please describe your work in a sentence or two.' },
      { status: 400 },
    );
  }

  const env = await ensureDefaultEnvironment(identity.id, identity.name ?? null);

  // Anthropic call — BYOK-aware via the existing client factory.
  let scaffold: EnvironmentScaffold;
  try {
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
    const text =
      first && first.type === 'text' ? first.text : '';
    const clean = text
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const parsed = JSON.parse(clean);
    if (!isValidScaffold(parsed)) {
      throw new Error('Scaffold failed shape validation');
    }
    scaffold = parsed;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to generate scaffold';
    return Response.json({ error: message }, { status: 500 });
  }

  // Create Systems + Workflows. Slugs in the scaffold map to real ids
  // so canvas widgets can reference them.
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
  }

  // Mark onboarding complete so middleware stops redirecting to
  // /welcome on subsequent navigations.
  await prisma.identity.update({
    where: { id: identity.id },
    data: { onboardedAt: new Date() },
  });

  return Response.json({
    ok: true,
    environmentId: env.id,
    systemIds: Object.values(slugToId),
    scaffold, // return the scaffold so the client can render the canvas
    slugToId,
  });
}
