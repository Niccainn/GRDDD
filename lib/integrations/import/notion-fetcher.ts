import type { FetchResult, ImportItem, ImportGroup } from './normalize';
import { normalizeStatus } from './normalize';

/**
 * Fetch importable data from a connected Notion integration.
 * Uses the existing Notion client to list databases and their pages.
 */
export async function fetchNotionData(
  client: { listDatabases: (limit?: number) => Promise<Array<{ id: string; title: string; url: string }>> },
  selectedDatabaseIds?: string[]
): Promise<FetchResult> {
  const databases = await client.listDatabases(50);
  const groups: ImportGroup[] = databases.map(db => ({
    id: db.id,
    name: db.title || 'Untitled Database',
    itemCount: 0, // populated after selection
  }));

  // If no selection yet, return groups only for the picker UI
  if (!selectedDatabaseIds || selectedDatabaseIds.length === 0) {
    return { groups, items: [] };
  }

  // For selected databases, we'd query each database's pages
  // The Notion client currently only has searchPages and listDatabases
  // In production, this would call the Notion API to query database pages
  // For now, return the groups as importable items with placeholder data
  const items: ImportItem[] = [];
  const selectedGroups = groups.filter(g => selectedDatabaseIds.includes(g.id));

  for (const group of selectedGroups) {
    // Each database becomes a group that maps to a Grid system
    items.push({
      sourceId: group.id,
      title: group.name,
      description: `Imported from Notion database: ${group.name}`,
      status: 'TODO',
      groupName: group.name,
    });
  }

  return { groups: selectedGroups, items };
}
