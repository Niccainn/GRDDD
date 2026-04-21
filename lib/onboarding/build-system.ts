/**
 * Server-side System + Workflow creation for onboarding wedges.
 *
 * Called by the build-stream SSE route. Idempotent per (identity, wedge):
 * re-running with the same wedgeId on the same identity returns the
 * existing System rather than creating a duplicate.
 */
import { prisma } from '@/lib/db';
import { wedgeById, type WedgeId } from '@/app/welcome/wedges';

type BuildResult = { systemId: string; environmentId: string; created: boolean };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48) || 'workspace';
}

async function ensureDefaultEnvironment(identityId: string, identityName: string | null) {
  const existing = await prisma.environment.findFirst({
    where: { ownerId: identityId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing;

  const baseName = (identityName || 'My').split(' ')[0] + ' Workspace';
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

export async function buildSystemForWedge(
  identityId: string,
  identityName: string | null,
  wedgeId: WedgeId,
): Promise<BuildResult> {
  const wedge = wedgeById(wedgeId);
  if (!wedge) throw new Error(`Unknown wedge: ${wedgeId}`);

  const env = await ensureDefaultEnvironment(identityId, identityName);

  // Idempotency — if a System with this wedge's name already exists in
  // the environment, return it instead of creating a second.
  const existingSystem = await prisma.system.findFirst({
    where: {
      environmentId: env.id,
      name: wedge.systemName,
      deletedAt: null,
    },
  });
  if (existingSystem) {
    return { systemId: existingSystem.id, environmentId: env.id, created: false };
  }

  const system = await prisma.system.create({
    data: {
      name: wedge.systemName,
      color: wedge.systemColor,
      description: wedge.oneLiner,
      environmentId: env.id,
      creatorId: identityId,
      config: JSON.stringify({ wedge: wedgeId }),
    },
  });

  // Minimal starter workflow — stages are a JSON array per schema.
  // This is the "honest theatre": the user sees Nova stream the build,
  // the row is written in one atomic step, but the structure is real.
  if (wedge.id !== 'custom') {
    await prisma.workflow.create({
      data: {
        name: wedge.workflowName,
        status: 'draft',
        systemId: system.id,
        environmentId: env.id,
        creatorId: identityId,
        stages: JSON.stringify(
          wedge.workflowName.split('→').map((s, i) => ({
            id: `stage-${i}`,
            name: s.trim(),
            order: i,
          })),
        ),
      },
    });
  }

  return { systemId: system.id, environmentId: env.id, created: true };
}
