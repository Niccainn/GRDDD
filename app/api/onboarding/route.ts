import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { createSampleData } from '@/lib/sample-data';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
    || 'workspace';
}

export async function POST(req: Request) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) {
    return Response.json({ error: 'Rate limited' }, { status: 429 });
  }

  const body = await req.json();
  const { name, role, workType, environmentName, environmentType } = body as {
    name?: string;
    role?: string;
    workType?: string;
    environmentName?: string;
    environmentType?: string;
  };

  // Update identity name/role if provided
  if (name || role) {
    const updateData: Record<string, string> = {};
    if (name) updateData.name = name;
    if (role) updateData.description = role;
    await prisma.identity.update({
      where: { id: identity.id },
      data: {
        ...updateData,
        onboardedAt: new Date(),
      },
    });
  } else {
    await prisma.identity.update({
      where: { id: identity.id },
      data: { onboardedAt: new Date() },
    });
  }

  // Create environment
  const envName = environmentName || 'My Workspace';
  let slug = slugify(envName);

  // Ensure slug uniqueness
  const existing = await prisma.environment.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const envColor = {
    Marketing: '#F7C700',
    Engineering: '#7193ED',
    Design: '#BF9FF1',
    Operations: '#C8F26B',
    Custom: '#FF6B6B',
  }[environmentType || 'Custom'] || '#7193ED';

  const environment = await prisma.environment.create({
    data: {
      name: envName,
      slug,
      color: envColor,
      ownerId: identity.id,
    },
  });

  // Create a starter system
  const system = await prisma.system.create({
    data: {
      name: 'Getting Started',
      description: 'Your first system — a workspace to explore GRID capabilities.',
      color: envColor,
      environmentId: environment.id,
      creatorId: identity.id,
    },
  });

  // Create a starter workflow inside the system
  const starterStages = JSON.stringify([
    {
      id: 'stage-1',
      name: 'Input',
      type: 'input',
      config: {},
    },
    {
      id: 'stage-2',
      name: 'Process with Nova',
      type: 'nova',
      config: { prompt: 'Analyze and summarize the input.' },
    },
    {
      id: 'stage-3',
      name: 'Output',
      type: 'output',
      config: {},
    },
  ]);

  await prisma.workflow.create({
    data: {
      name: 'Getting Started',
      description: 'A sample workflow to help you explore how GRID automations work.',
      status: 'DRAFT',
      stages: starterStages,
      systemId: system.id,
      environmentId: environment.id,
      creatorId: identity.id,
    },
  });

  // Populate sample data so the workspace feels alive immediately
  await createSampleData(identity.id, environment.id, system.id);

  return Response.json({
    environmentId: environment.id,
    environmentSlug: environment.slug,
    systemId: system.id,
  });
}
