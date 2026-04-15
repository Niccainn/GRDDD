// ---------------------------------------------------------------------------
// View configuration types and localStorage helpers for custom database views
// ---------------------------------------------------------------------------

export type ViewType = 'table' | 'board' | 'gallery' | 'timeline';

export type EntityType = 'tasks' | 'workflows' | 'systems' | 'goals' | 'executions';

export type ViewFilter = {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt';
  value: string;
};

export type ViewConfig = {
  id: string;
  name: string;
  type: ViewType;
  entityType: EntityType;
  filters: ViewFilter[];
  sortBy?: { field: string; direction: 'asc' | 'desc' };
  groupBy?: string;
  visibleColumns: string[];
  savedAt?: string;
};

// ---------------------------------------------------------------------------
// Default columns per entity type
// ---------------------------------------------------------------------------

const DEFAULT_COLUMNS: Record<EntityType, string[]> = {
  tasks: ['title', 'status', 'priority', 'assignee', 'dueDate', 'createdAt'],
  workflows: ['name', 'status', 'systemName', 'environmentName', 'executions', 'updatedAt'],
  systems: ['name', 'environmentId', 'color', 'createdAt'],
  goals: ['title', 'status', 'progress', 'target', 'current', 'dueDate'],
  executions: ['id', 'status', 'system', 'workflow', 'createdAt', 'completedAt'],
};

export function getDefaultColumns(entityType: EntityType): string[] {
  return DEFAULT_COLUMNS[entityType] ?? [];
}

// ---------------------------------------------------------------------------
// All available columns per entity type (for the column picker)
// ---------------------------------------------------------------------------

export type ColumnDef = { key: string; label: string; type: 'string' | 'date' | 'number' | 'status' | 'priority' };

const COLUMN_DEFS: Record<EntityType, ColumnDef[]> = {
  tasks: [
    { key: 'title', label: 'Title', type: 'string' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'priority', label: 'Priority', type: 'priority' },
    { key: 'assignee', label: 'Assignee', type: 'string' },
    { key: 'creator', label: 'Creator', type: 'string' },
    { key: 'dueDate', label: 'Due date', type: 'date' },
    { key: 'createdAt', label: 'Created', type: 'date' },
    { key: 'updatedAt', label: 'Updated', type: 'date' },
    { key: 'labels', label: 'Labels', type: 'string' },
    { key: 'environment', label: 'Environment', type: 'string' },
    { key: 'system', label: 'System', type: 'string' },
  ],
  workflows: [
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'systemName', label: 'System', type: 'string' },
    { key: 'environmentName', label: 'Environment', type: 'string' },
    { key: 'executions', label: 'Executions', type: 'number' },
    { key: 'createdAt', label: 'Created', type: 'date' },
    { key: 'updatedAt', label: 'Updated', type: 'date' },
  ],
  systems: [
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'description', label: 'Description', type: 'string' },
    { key: 'color', label: 'Color', type: 'string' },
    { key: 'healthScore', label: 'Health', type: 'number' },
    { key: 'environmentId', label: 'Environment', type: 'string' },
    { key: 'createdAt', label: 'Created', type: 'date' },
  ],
  goals: [
    { key: 'title', label: 'Title', type: 'string' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'progress', label: 'Progress', type: 'number' },
    { key: 'metric', label: 'Metric', type: 'string' },
    { key: 'target', label: 'Target', type: 'string' },
    { key: 'current', label: 'Current', type: 'string' },
    { key: 'dueDate', label: 'Due date', type: 'date' },
    { key: 'system', label: 'System', type: 'string' },
    { key: 'createdAt', label: 'Created', type: 'date' },
    { key: 'updatedAt', label: 'Updated', type: 'date' },
  ],
  executions: [
    { key: 'id', label: 'ID', type: 'string' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'input', label: 'Input', type: 'string' },
    { key: 'system', label: 'System', type: 'string' },
    { key: 'workflow', label: 'Workflow', type: 'string' },
    { key: 'validationScore', label: 'Score', type: 'number' },
    { key: 'createdAt', label: 'Created', type: 'date' },
    { key: 'completedAt', label: 'Completed', type: 'date' },
  ],
};

export function getColumnDefs(entityType: EntityType): ColumnDef[] {
  return COLUMN_DEFS[entityType] ?? [];
}

// ---------------------------------------------------------------------------
// Groupable fields per entity
// ---------------------------------------------------------------------------

const GROUPABLE_FIELDS: Record<EntityType, string[]> = {
  tasks: ['status', 'priority', 'assignee', 'environment', 'system'],
  workflows: ['status', 'systemName', 'environmentName'],
  systems: ['environmentId'],
  goals: ['status', 'system'],
  executions: ['status', 'system', 'workflow'],
};

export function getGroupableFields(entityType: EntityType): string[] {
  return GROUPABLE_FIELDS[entityType] ?? [];
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function storageKey(entityType: EntityType): string {
  return `grid:views:${entityType}`;
}

export function loadViews(entityType: EntityType): ViewConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(entityType));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveView(view: ViewConfig): void {
  if (typeof window === 'undefined') return;
  const views = loadViews(view.entityType);
  const idx = views.findIndex(v => v.id === view.id);
  const updated = { ...view, savedAt: new Date().toISOString() };
  if (idx >= 0) {
    views[idx] = updated;
  } else {
    views.push(updated);
  }
  localStorage.setItem(storageKey(view.entityType), JSON.stringify(views));
}

export function deleteView(entityType: EntityType, viewId: string): void {
  if (typeof window === 'undefined') return;
  const views = loadViews(entityType).filter(v => v.id !== viewId);
  localStorage.setItem(storageKey(entityType), JSON.stringify(views));
}

// ---------------------------------------------------------------------------
// Filter operator labels
// ---------------------------------------------------------------------------

export const OPERATOR_LABELS: Record<ViewFilter['operator'], string> = {
  eq: 'is',
  neq: 'is not',
  contains: 'contains',
  gt: 'greater than',
  lt: 'less than',
};
