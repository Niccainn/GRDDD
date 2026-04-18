import type { FetchResult, ImportItem, ImportGroup } from './normalize';
import { normalizeStatus } from './normalize';

/**
 * Fetch importable data from a connected Monday.com integration.
 */
export async function fetchMondayData(
  client: {
    listBoards: (limit?: number) => Promise<Array<{ id: string; name: string; state: string; updatedAt: string }>>;
    listItems: (boardId: string, limit?: number) => Promise<Array<{ id: string; name: string; state: string; group: string; updatedAt: string }>>;
  },
  selectedBoardIds?: string[]
): Promise<FetchResult> {
  const boards = await client.listBoards(50);
  const groups: ImportGroup[] = boards.map(b => ({
    id: b.id,
    name: b.name,
    itemCount: 0,
  }));

  if (!selectedBoardIds || selectedBoardIds.length === 0) {
    return { groups, items: [] };
  }

  const items: ImportItem[] = [];
  for (const boardId of selectedBoardIds) {
    const board = boards.find(b => b.id === boardId);
    if (!board) continue;

    const boardItems = await client.listItems(boardId, 200);
    for (const item of boardItems) {
      items.push({
        sourceId: item.id,
        title: item.name,
        status: normalizeStatus(item.state),
        groupName: board.name,
      });
    }

    const group = groups.find(g => g.id === boardId);
    if (group) group.itemCount = boardItems.length;
  }

  return { groups: groups.filter(g => selectedBoardIds.includes(g.id)), items };
}
