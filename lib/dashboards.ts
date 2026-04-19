/**
 * Custom dashboard types and localStorage CRUD helpers.
 * Dashboards are stored client-side under the key "grid:dashboards".
 */

export type WidgetType =
  | 'stat'
  | 'chart'
  | 'list'
  | 'progress'
  | 'activity'
  | 'tasks'
  | 'goals'
  | 'executions'
  | 'text'
  | 'embed';

export type Widget = {
  id: string;
  type: WidgetType;
  title: string;
  config: Record<string, any>;
  position: { x: number; y: number; w: number; h: number };
};

export type CustomDashboard = {
  id: string;
  name: string;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'grid:dashboards';

function genId(): string {
  return `db_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function genWidgetId(): string {
  return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadDashboards(): CustomDashboard[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDashboard(dashboard: CustomDashboard): CustomDashboard {
  const all = loadDashboards();
  const idx = all.findIndex((d) => d.id === dashboard.id);
  const updated = { ...dashboard, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    all[idx] = updated;
  } else {
    all.push(updated);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return updated;
}

export function deleteDashboard(id: string): void {
  const all = loadDashboards().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getDashboardById(id: string): CustomDashboard | null {
  return loadDashboards().find((d) => d.id === id) ?? null;
}

export function createDashboard(name: string): CustomDashboard {
  const now = new Date().toISOString();
  const dashboard: CustomDashboard = {
    id: genId(),
    name,
    widgets: [],
    createdAt: now,
    updatedAt: now,
  };
  saveDashboard(dashboard);
  return dashboard;
}

/**
 * Returns (or creates) the default dashboard with a sensible starter layout.
 */
export function getDefaultDashboard(): CustomDashboard {
  const all = loadDashboards();
  const existing = all.find((d) => d.name === 'Overview');
  if (existing) return existing;

  const now = new Date().toISOString();
  const dashboard: CustomDashboard = {
    id: 'default',
    name: 'Overview',
    createdAt: now,
    updatedAt: now,
    widgets: [
      // Top row: 4 stat widgets
      {
        id: genWidgetId(),
        type: 'stat',
        title: 'Total Tasks',
        config: { metric: 'totalTasks', color: '#7193ED' },
        position: { x: 0, y: 0, w: 3, h: 2 },
      },
      {
        id: genWidgetId(),
        type: 'stat',
        title: 'Active Workflows',
        config: { metric: 'activeWorkflows', color: '#15AD70' },
        position: { x: 3, y: 0, w: 3, h: 2 },
      },
      {
        id: genWidgetId(),
        type: 'stat',
        title: 'Executions',
        config: { metric: 'totalExecutions', color: '#BF9FF1' },
        position: { x: 6, y: 0, w: 3, h: 2 },
      },
      {
        id: genWidgetId(),
        type: 'stat',
        title: 'Goals',
        config: { metric: 'totalGoals', color: '#F7C700' },
        position: { x: 9, y: 0, w: 3, h: 2 },
      },
      // Middle row: chart + activity
      {
        id: genWidgetId(),
        type: 'chart',
        title: 'Executions Over Time',
        config: { dataSource: 'executions', chartType: 'bar', timeRange: '7d' },
        position: { x: 0, y: 2, w: 7, h: 4 },
      },
      {
        id: genWidgetId(),
        type: 'activity',
        title: 'Recent Activity',
        config: { limit: 8 },
        position: { x: 7, y: 2, w: 5, h: 4 },
      },
      // Bottom row: tasks + goals
      {
        id: genWidgetId(),
        type: 'tasks',
        title: 'Recent Tasks',
        config: { limit: 5, statusFilter: 'all' },
        position: { x: 0, y: 6, w: 6, h: 4 },
      },
      {
        id: genWidgetId(),
        type: 'goals',
        title: 'Goal Progress',
        config: { limit: 4 },
        position: { x: 6, y: 6, w: 6, h: 4 },
      },
    ],
  };

  saveDashboard(dashboard);
  return dashboard;
}

/** Catalog of available widget types for the palette */
export const WIDGET_CATALOG: { type: WidgetType; label: string; description: string; defaultW: number; defaultH: number; icon: string }[] = [
  { type: 'stat', label: 'Stat', description: 'Big number with label', defaultW: 3, defaultH: 2, icon: '#' },
  { type: 'chart', label: 'Chart', description: 'Bar or line chart', defaultW: 6, defaultH: 4, icon: '|' },
  { type: 'list', label: 'List', description: 'Recent items list', defaultW: 4, defaultH: 4, icon: '=' },
  { type: 'progress', label: 'Progress', description: 'Progress ring or bar', defaultW: 3, defaultH: 3, icon: 'O' },
  { type: 'activity', label: 'Activity', description: 'Mini activity feed', defaultW: 5, defaultH: 4, icon: '~' },
  { type: 'tasks', label: 'Tasks', description: 'Filtered task list', defaultW: 6, defaultH: 4, icon: 'v' },
  { type: 'goals', label: 'Goals', description: 'Goal progress cards', defaultW: 6, defaultH: 4, icon: '*' },
  { type: 'executions', label: 'Executions', description: 'Recent executions', defaultW: 6, defaultH: 4, icon: '>' },
  { type: 'text', label: 'Text', description: 'Markdown content block', defaultW: 4, defaultH: 3, icon: 'T' },
  { type: 'embed', label: 'Embed', description: 'Iframe embed', defaultW: 6, defaultH: 4, icon: '<>' },
];
