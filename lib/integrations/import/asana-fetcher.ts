import type { FetchResult, ImportItem, ImportGroup } from './normalize';
import { normalizeStatus } from './normalize';

/**
 * Fetch importable data from a connected Asana integration.
 */
export async function fetchAsanaData(
  client: {
    listProjects: (workspaceId: string) => Promise<Array<{ id: string; name: string }>>;
    getMyTasks: (limit?: number) => Promise<Array<{ id: string; name: string; completed: boolean; dueOn: string | null; modifiedAt: string }>>;
  },
  selectedProjectIds?: string[]
): Promise<FetchResult> {
  // Fetch tasks directly (Asana client uses user's tasks)
  const tasks = await client.getMyTasks(100);

  // Group by project would require per-task project info
  // For now, all tasks come in as one group
  const groups: ImportGroup[] = [{
    id: 'my-tasks',
    name: 'My Tasks',
    itemCount: tasks.length,
  }];

  if (!selectedProjectIds || selectedProjectIds.length === 0) {
    return { groups, items: [] };
  }

  const items: ImportItem[] = tasks.map(task => ({
    sourceId: task.id,
    title: task.name,
    status: normalizeStatus(task.completed ? 'true' : 'false'),
    dueDate: task.dueOn || undefined,
    groupName: 'My Tasks',
  }));

  return { groups, items };
}
