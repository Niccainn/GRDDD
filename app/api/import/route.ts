import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const body = await req.json();
  const { environmentId, systems, tasks, source } = body;

  if (!environmentId) {
    return Response.json({ error: 'environmentId required' }, { status: 400 });
  }

  // Verify environment access
  const env = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identity.id },
        { memberships: { some: { identityId: identity.id } } },
      ],
    },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const validSources = ['notion', 'asana', 'monday', 'csv'];
  const importSource = validSources.includes(source) ? source : 'csv';

  let systemsCreated = 0;
  let tasksCreated = 0;
  const errors: string[] = [];
  const systemMap = new Map<string, string>(); // groupName → systemId

  // Create systems from groups
  if (Array.isArray(systems)) {
    for (const sys of systems) {
      if (!sys.name?.trim()) continue;
      try {
        // Check if system already exists by name
        const existing = await prisma.system.findFirst({
          where: { environmentId, name: sys.name.trim() },
        });
        if (existing) {
          systemMap.set(sys.name.trim(), existing.id);
          continue;
        }

        const created = await prisma.system.create({
          data: {
            name: sys.name.trim(),
            description: sys.description || `Imported from ${importSource}`,
            color: sys.color || null,
            environmentId,
            creatorId: identity.id,
          },
        });
        systemMap.set(sys.name.trim(), created.id);
        systemsCreated++;
      } catch (e) {
        errors.push(`System "${sys.name}": ${e instanceof Error ? e.message : 'creation failed'}`);
      }
    }
  }

  // Create tasks
  if (Array.isArray(tasks)) {
    const validStatuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'];
    const validPriorities = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];

    // Get max position for ordering
    const maxPos = await prisma.task.aggregate({
      where: { environmentId },
      _max: { position: true },
    });
    let position = (maxPos._max.position ?? 0) + 1000;

    for (const task of tasks) {
      if (!task.title?.trim()) continue;

      // Dedup: skip if sourceId + sourceProvider already exists
      if (task.sourceId && importSource) {
        const existing = await prisma.task.findFirst({
          where: {
            environmentId,
            sourceId: task.sourceId,
            sourceProvider: importSource,
            deletedAt: null,
          },
        });
        if (existing) continue; // Skip duplicate
      }

      const systemId = task.systemName ? systemMap.get(task.systemName.trim()) : null;

      try {
        await prisma.task.create({
          data: {
            title: task.title.trim(),
            description: task.description || null,
            status: validStatuses.includes(task.status) ? task.status : 'TODO',
            priority: validPriorities.includes(task.priority) ? task.priority : 'NORMAL',
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            labels: task.labels ? JSON.stringify(task.labels) : null,
            position,
            environmentId,
            systemId: systemId || null,
            creatorId: identity.id,
            sourceId: task.sourceId || null,
            sourceProvider: importSource,
          },
        });
        tasksCreated++;
        position += 1000;
      } catch (e) {
        errors.push(`Task "${task.title}": ${e instanceof Error ? e.message : 'creation failed'}`);
      }
    }
  }

  return Response.json({
    systemsCreated,
    tasksCreated,
    errors: errors.length > 0 ? errors : undefined,
    source: importSource,
  }, { status: 201 });
}
