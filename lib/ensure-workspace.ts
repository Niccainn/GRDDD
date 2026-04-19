import { prisma } from './db';
import { createSampleData } from './sample-data';

/**
 * Ensures the user has at least one environment.
 * If not, creates a default "My Workspace" environment with a system and sample data.
 * Returns the user's first environment.
 */
export async function ensureWorkspace(identityId: string) {
  // Check if user has any environments
  const existing = await prisma.environment.findFirst({
    where: {
      OR: [
        { ownerId: identityId },
        { memberships: { some: { identityId } } },
      ],
      deletedAt: null,
    },
    include: { systems: { where: { deletedAt: null }, take: 1 } },
  });

  if (existing) return existing;

  // Auto-create workspace
  const slug = `workspace-${Date.now().toString(36)}`;

  const environment = await prisma.environment.create({
    data: {
      name: 'My Workspace',
      slug,
      color: '#15AD70',
      ownerId: identityId,
    },
  });

  const system = await prisma.system.create({
    data: {
      name: 'Getting Started',
      description: 'Your first system — explore GRID capabilities here.',
      color: '#15AD70',
      environmentId: environment.id,
      creatorId: identityId,
    },
  });

  // Create sample data so the workspace isn't empty
  try {
    await createSampleData(identityId, environment.id, system.id);
  } catch (e) {
    console.warn('[ensure-workspace] Sample data creation failed:', e);
  }

  return { ...environment, systems: [system] };
}
