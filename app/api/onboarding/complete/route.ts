/**
 * POST /api/onboarding/complete
 *
 * Called from the /welcome wizard on the final step. Accepts:
 *   { name, role, workspaceName, template }
 * and:
 *   - updates the Identity name / metadata.role
 *   - creates the user's first Environment (owned by them)
 *   - stamps Identity.onboardedAt so the middleware stops routing
 *     them back to /welcome on subsequent navigations
 *
 * Requires an authenticated session (not whitelisted in middleware).
 */
import { getAuthIdentity } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Template = 'solo' | 'team' | 'blank';

// Starter seed data per template. We keep this tiny for v1 — the
// wizard is mostly about capturing name / workspace, not shipping a
// full library. Templates can be expanded later without a schema
// change since starter content is just rows in System / Goal.
const TEMPLATE_LABEL: Record<Template, string> = {
  solo: 'Solo builder',
  team: 'Small team',
  blank: 'Blank workspace',
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48) || 'workspace';
}

export async function POST(req: Request) {
  try {
    const identity = await getAuthIdentity();
    const body = await req.json().catch(() => ({}));

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const role = typeof body?.role === 'string' ? body.role.trim().slice(0, 80) : '';
    const workspaceName = typeof body?.workspaceName === 'string' ? body.workspaceName.trim() : '';
    const templateRaw = typeof body?.template === 'string' ? body.template : 'blank';
    const template: Template = (['solo', 'team', 'blank'] as const).includes(templateRaw as Template)
      ? (templateRaw as Template)
      : 'blank';
    const brandTone = typeof body?.brandTone === 'string' ? body.brandTone.trim().slice(0, 500) : '';
    const brandAudience = typeof body?.brandAudience === 'string' ? body.brandAudience.trim().slice(0, 500) : '';
    const brandValues = typeof body?.brandValues === 'string' ? body.brandValues.trim().slice(0, 500) : '';

    if (!name) return Response.json({ error: 'Name is required.' }, { status: 400 });
    if (!workspaceName) return Response.json({ error: 'Workspace name is required.' }, { status: 400 });

    // Generate a unique slug by suffixing a short random tail on
    // collision. We don't want to 400 the user out of onboarding
    // just because "acme" is taken.
    const baseSlug = slugify(workspaceName);
    let slug = baseSlug;
    for (let i = 0; i < 5; i++) {
      const taken = await prisma.environment.findUnique({ where: { slug } });
      if (!taken) break;
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    // Merge role into metadata JSON rather than adding a new column.
    // The Identity model already has a freeform metadata field for
    // exactly this kind of soft profile data.
    const existingMeta = identity as unknown as { metadata?: string | null };
    let meta: Record<string, unknown> = {};
    try {
      if (existingMeta.metadata) meta = JSON.parse(existingMeta.metadata);
    } catch {
      meta = {};
    }
    if (role) meta.role = role;
    meta.onboardingTemplate = template;

    await prisma.identity.update({
      where: { id: identity.id },
      data: {
        name,
        metadata: JSON.stringify(meta),
        onboardedAt: new Date(),
      },
    });

    const environment = await prisma.environment.create({
      data: {
        name: workspaceName,
        slug,
        description: `${TEMPLATE_LABEL[template]} workspace`,
        ownerId: identity.id,
        ...(brandTone ? { brandTone } : {}),
        ...(brandAudience ? { brandAudience } : {}),
        ...(brandValues ? { brandValues } : {}),
      },
    });

    // Seed starter systems for non-blank templates so the user
    // lands on a dashboard with real structure to explore.
    if (template !== 'blank') {
      const starterSystems = template === 'solo'
        ? [
            { name: 'Marketing', color: '#7193ED', description: 'Content, campaigns, and audience growth' },
            { name: 'Operations', color: '#C8F26B', description: 'Processes, workflows, and internal systems' },
            { name: 'Product', color: '#BF9FF1', description: 'Roadmap, features, and delivery' },
          ]
        : [
            { name: 'Marketing', color: '#7193ED', description: 'Content, campaigns, and audience growth' },
            { name: 'Sales', color: '#F7C700', description: 'Pipeline, outreach, and revenue' },
            { name: 'Operations', color: '#C8F26B', description: 'Processes, workflows, and internal systems' },
            { name: 'Product', color: '#BF9FF1', description: 'Roadmap, features, and delivery' },
            { name: 'Support', color: '#FF6B6B', description: 'Customer success and issue resolution' },
          ];

      for (const sys of starterSystems) {
        const system = await prisma.system.create({
          data: {
            name: sys.name,
            description: sys.description,
            color: sys.color,
            environmentId: environment.id,
            creatorId: identity.id,
          },
        });

        // Create one starter workflow per system
        await prisma.workflow.create({
          data: {
            name: `${sys.name} Pipeline`,
            description: `Automated ${sys.name.toLowerCase()} workflow — edit stages to customize`,
            status: 'DRAFT',
            stages: JSON.stringify([
              `Research & gather inputs`,
              `Draft & generate`,
              `Review & refine`,
            ]),
            systemId: system.id,
            environmentId: environment.id,
            creatorId: identity.id,
          },
        });
      }
    }

    // Set onboarded cookie so middleware stops redirecting to /welcome
    // without a DB hit on every request.
    const res = Response.json({ ok: true, environmentId: environment.id, slug });
    const headers = new Headers(res.headers);
    headers.append(
      'Set-Cookie',
      // SameSite=Lax so the cookie survives OAuth ping-pongs — Strict
      // was getting dropped by some browsers on the Google-calendar
      // return trip, re-triggering /welcome every integration connect.
      `grid_onboarded=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`
    );
    return new Response(res.body, { status: res.status, headers });
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : 'Onboarding failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
