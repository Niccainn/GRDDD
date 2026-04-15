import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsEnvironment } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 48);
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let attempt = 0;
  while (true) {
    const existing = await prisma.environment.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    attempt++;
    candidate = `${base}-${attempt}`;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;
  await assertOwnsEnvironment(id, identity.id);
  const body = await req.json().catch(() => ({}));
  const newName: string = body.name?.trim() || '';
  if (!newName) return Response.json({ error: 'Name is required' }, { status: 400 });

  // Load source environment with everything
  const source = await prisma.environment.findUnique({
    where: { id },
    include: {
      systems: {
        include: {
          workflows: true,
          intelligence: true,
        },
      },
    },
  });

  if (!source) return Response.json({ error: 'Not found' }, { status: 404 });

  if (!identity) return Response.json({ error: 'No identity' }, { status: 500 });

  const newSlug = await uniqueSlug(slugify(newName));

  // Deep clone inside a transaction
  const newEnv = await prisma.$transaction(async (tx) => {
    // 1. Create the new environment
    const env = await tx.environment.create({
      data: {
        name: newName,
        slug: newSlug,
        description: source.description ? `${source.description} (clone)` : `Clone of ${source.name}`,
        color: source.color,
        icon: source.icon,
        settings: source.settings,
        ownerId: identity.id,
      },
    });

    // 2. Clone systems
    for (const sys of source.systems) {
      const newSys = await tx.system.create({
        data: {
          name: sys.name,
          description: sys.description,
          color: sys.color,
          icon: sys.icon,
          config: sys.config,
          metrics: sys.metrics,
          healthScore: sys.healthScore,
          environmentId: env.id,
          creatorId: identity.id,
        },
      });

      // 3. Clone workflows for this system
      for (const wf of sys.workflows) {
        await tx.workflow.create({
          data: {
            name: wf.name,
            description: wf.description,
            status: 'DRAFT', // clones start as drafts
            config: wf.config,
            stages: wf.stages,
            nodes: wf.nodes,
            edges: wf.edges,
            systemId: newSys.id,
            environmentId: env.id,
            creatorId: identity.id,
          },
        });
      }

      // 4. Clone intelligence records for this system
      for (const intel of sys.intelligence) {
        await tx.intelligence.create({
          data: {
            type: intel.type,
            name: intel.name,
            description: intel.description,
            config: intel.config,
            isActive: intel.isActive,
            metadata: intel.metadata,
            systemId: newSys.id,
            environmentId: env.id,
            creatorId: identity.id,
          },
        });
      }
    }

    return env;
  });

  audit({
    action: 'environment.created',
    entity: 'Environment',
    entityId: newEnv.id,
    entityName: newEnv.name,
    metadata: { clonedFrom: source.id, clonedFromName: source.name, systemCount: source.systems.length },
    actorId: identity.id,
    actorName: identity.name,
    environmentId: newEnv.id,
    environmentName: newEnv.name,
  });

  return Response.json({
    id: newEnv.id,
    slug: newEnv.slug,
    name: newEnv.name,
    systemCount: source.systems.length,
    workflowCount: source.systems.reduce((sum, s) => sum + s.workflows.length, 0),
  }, { status: 201 });
}
