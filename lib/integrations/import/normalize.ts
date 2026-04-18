/**
 * Normalized import item — the common shape that all integration
 * fetchers produce, regardless of source (Notion, Asana, Monday, CSV).
 */
export type ImportItem = {
  sourceId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string; // ISO date
  labels?: string[];
  groupName?: string; // project/database/board name → maps to Grid system
};

export type ImportGroup = {
  id: string;
  name: string;
  itemCount: number;
};

export type FetchResult = {
  groups: ImportGroup[];
  items: ImportItem[];
};

/** Map external statuses to Grid task statuses */
const STATUS_MAP: Record<string, string> = {
  // Notion
  'not started': 'TODO',
  'in progress': 'IN_PROGRESS',
  'done': 'DONE',
  'completed': 'DONE',
  // Asana
  'true': 'DONE', // completed: true
  'false': 'TODO',
  // Monday
  'working on it': 'IN_PROGRESS',
  'stuck': 'IN_PROGRESS',
  // Generic
  'todo': 'TODO',
  'backlog': 'BACKLOG',
  'review': 'REVIEW',
  'cancelled': 'CANCELLED',
};

export function normalizeStatus(raw?: string): string {
  if (!raw) return 'TODO';
  return STATUS_MAP[raw.toLowerCase()] || 'TODO';
}

const PRIORITY_MAP: Record<string, string> = {
  'urgent': 'URGENT',
  'high': 'HIGH',
  'medium': 'NORMAL',
  'normal': 'NORMAL',
  'low': 'LOW',
  'critical': 'URGENT',
};

export function normalizePriority(raw?: string): string {
  if (!raw) return 'NORMAL';
  return PRIORITY_MAP[raw.toLowerCase()] || 'NORMAL';
}
