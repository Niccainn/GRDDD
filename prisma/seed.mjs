import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  // ── Demo identity ──────────────────────────────────────────────────────────
  let identity = await prisma.identity.findFirst({ where: { email: 'demo@grid.app' } });
  if (!identity) {
    identity = await prisma.identity.create({
      data: {
        type: 'PERSON',
        name: 'Demo User',
        email: 'demo@grid.app',
        description: 'Workspace owner',
      },
    });
    console.log('✓ Created demo identity');
  }

  // ── Demo environment ───────────────────────────────────────────────────────
  let env = await prisma.environment.findFirst({ where: { slug: 'operations' } });
  if (!env) {
    env = await prisma.environment.create({
      data: {
        name: 'Operations',
        slug: 'operations',
        description: 'Core operational environment',
        color: '#15AD70',
        ownerId: identity.id,
      },
    });
    console.log('✓ Created Operations environment');
  }

  // ── Demo system ────────────────────────────────────────────────────────────
  let system = await prisma.system.findFirst({ where: { name: 'Content Engine', environmentId: env.id } });
  if (!system) {
    system = await prisma.system.create({
      data: {
        name: 'Content Engine',
        description: 'Manages content creation, review, and publication workflows',
        color: '#7193ED',
        environmentId: env.id,
        creatorId: identity.id,
        healthScore: 82,
      },
    });
    console.log('✓ Created Content Engine system');
  }

  // ── Demo Nova intelligence ─────────────────────────────────────────────────
  let intel = await prisma.intelligence.findFirst({ where: { systemId: system.id, type: 'AI_AGENT' } });
  if (!intel) {
    intel = await prisma.intelligence.create({
      data: {
        name: 'Nova',
        type: 'AI_AGENT',
        isActive: true,
        systemId: system.id,
        environmentId: env.id,
        creatorId: identity.id,
      },
    });
    console.log('✓ Created Nova intelligence');
  }

  // ── Demo workflow ──────────────────────────────────────────────────────────
  let workflow = await prisma.workflow.findFirst({ where: { name: 'Blog Post Pipeline', systemId: system.id } });
  if (!workflow) {
    workflow = await prisma.workflow.create({
      data: {
        name: 'Blog Post Pipeline',
        description: 'End-to-end blog content creation and publication',
        status: 'ACTIVE',
        stages: JSON.stringify(['Research', 'Draft', 'Review', 'Publish']),
        systemId: system.id,
        environmentId: env.id,
        creatorId: identity.id,
      },
    });
    console.log('✓ Created Blog Post Pipeline workflow');
  }

  console.log('Seed complete.');
  await prisma.$disconnect();
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
