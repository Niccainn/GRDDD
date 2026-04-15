import { prisma } from '@/lib/db';

/**
 * Seeds autonomy configs for existing workflows and systems in an environment.
 * Called after sample data is created to populate the autonomy gradient UI.
 */
export async function seedAutonomyConfigs(environmentId: string) {
  // Find workflows in this environment
  const workflows = await prisma.workflow.findMany({
    where: { environmentId },
    select: { id: true, name: true },
  });

  // Find systems in this environment
  const systems = await prisma.system.findMany({
    where: { environmentId },
    select: { id: true, name: true },
  });

  // Predefined seed data keyed by name
  const workflowSeeds: Record<string, {
    level: number;
    totalActions: number;
    approvedActions: number;
    overriddenActions: number;
    approvalRate: number;
    recommendedLevel?: number;
    recommendReason?: string;
  }> = {
    'Content Pipeline': {
      level: 2,
      totalActions: 45,
      approvedActions: 38,
      overriddenActions: 7,
      approvalRate: 0.84,
      recommendedLevel: 3,
      recommendReason: '84% approval rate over 45 actions suggests high trust',
    },
    'Client Onboarding': {
      level: 1,
      totalActions: 23,
      approvedActions: 15,
      overriddenActions: 8,
      approvalRate: 0.65,
    },
  };

  const systemSeeds: Record<string, {
    level: number;
    totalActions: number;
    approvedActions: number;
    overriddenActions: number;
    approvalRate: number;
    recommendedLevel?: number;
    recommendReason?: string;
  }> = {
    'Getting Started': {
      level: 1,
      totalActions: 30,
      approvedActions: 24,
      overriddenActions: 6,
      approvalRate: 0.80,
      recommendedLevel: 2,
      recommendReason: '80% approval rate over 30 actions indicates readiness for more autonomy',
    },
  };

  // Seed workflow configs
  for (const wf of workflows) {
    const seed = workflowSeeds[wf.name];
    if (!seed) continue;

    await prisma.autonomyConfig.upsert({
      where: {
        scopeType_scopeId: { scopeType: 'workflow', scopeId: wf.id },
      },
      update: { ...seed, scopeLabel: wf.name },
      create: {
        scopeType: 'workflow',
        scopeId: wf.id,
        scopeLabel: wf.name,
        environmentId,
        ...seed,
      },
    });
  }

  // Seed system configs
  for (const sys of systems) {
    const seed = systemSeeds[sys.name];
    if (!seed) continue;

    await prisma.autonomyConfig.upsert({
      where: {
        scopeType_scopeId: { scopeType: 'system', scopeId: sys.id },
      },
      update: { ...seed, scopeLabel: sys.name },
      create: {
        scopeType: 'system',
        scopeId: sys.id,
        scopeLabel: sys.name,
        environmentId,
        ...seed,
      },
    });
  }
}
