'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { EntityType, ViewType, ViewConfig, ViewFilter } from '@/lib/views';
import {
  getDefaultColumns,
  getColumnDefs,
  getGroupableFields,
  loadViews,
  saveView,
  deleteView,
  OPERATOR_LABELS,
} from '@/lib/views';

// ---------------------------------------------------------------------------
// Icons (inline SVG to avoid icon-library deps)
// ---------------------------------------------------------------------------

function TableIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: active ? 1 : 0.4 }}>
      <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6" y1="6" x2="6" y2="14" stroke="currentColor" strokeWidth="1.2" />
      <line x1="11" y1="6" x2="11" y2="14" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function BoardIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: active ? 1 : 0.4 }}>
      <rect x="1" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="6" y="2" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="11" y="2" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function GalleryIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: active ? 1 : 0.4 }}>
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function TimelineIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: active ? 1 : 0.4 }}>
      <line x1="1" y1="14" x2="15" y2="14" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2" y="3" width="5" height="2.5" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="5" y="7" width="7" height="2.5" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="3" y="11" width="4" height="2.5" rx="1" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

const VIEW_ICONS: Record<ViewType, (p: { active?: boolean }) => React.ReactElement> = {
  table: TableIcon,
  board: BoardIcon,
  gallery: GalleryIcon,
  timeline: TimelineIcon,
};

const VIEW_LABELS: Record<ViewType, string> = {
  table: 'Table',
  board: 'Board',
  gallery: 'Gallery',
  timeline: 'Timeline',
};

// ---------------------------------------------------------------------------
// Status / priority colors
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#15AD70', DRAFT: 'rgba(255,255,255,0.35)', PAUSED: '#F7C700',
  COMPLETED: '#7193ED', ARCHIVED: 'rgba(255,255,255,0.15)', RUNNING: '#3B82F6',
  FAILED: '#FF4D4D', SUCCESS: '#15AD70', PENDING: '#F7C700',
  TODO: 'rgba(255,255,255,0.35)', IN_PROGRESS: '#3B82F6', REVIEW: '#A78BFA',
  DONE: '#15AD70', CANCELLED: 'rgba(255,255,255,0.15)', BACKLOG: 'rgba(255,255,255,0.2)',
  ON_TRACK: '#15AD70', AT_RISK: '#F7C700', BEHIND: '#FF4D4D', ACHIEVED: '#7193ED',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#FF4D4D', HIGH: '#F97316', NORMAL: 'rgba(255,255,255,0.4)', LOW: 'rgba(255,255,255,0.2)',
};

// ---------------------------------------------------------------------------
// DataView component
// ---------------------------------------------------------------------------

type DataViewProps = {
  entityType: EntityType;
  data: Record<string, unknown>[];
  defaultView?: ViewType;
  compact?: boolean;
};

export default function DataView({ entityType, data, defaultView = 'table', compact = false }: DataViewProps) {
  const allColumnDefs = getColumnDefs(entityType);
  const groupableFields = getGroupableFields(entityType);

  const [viewType, setViewType] = useState<ViewType>(defaultView);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(getDefaultColumns(entityType));
  const [filters, setFilters] = useState<ViewFilter[]>([]);
  const [sortBy, setSortBy] = useState<{ field: string; direction: 'asc' | 'desc' } | undefined>();
  const [groupBy, setGroupBy] = useState<string | undefined>();
  const [viewName, setViewName] = useState('');
  const [savedViews, setSavedViews] = useState<ViewConfig[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // UI toggles
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [showSavedViews, setShowSavedViews] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);

  // Column resizing
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ col: string; startX: number; startW: number } | null>(null);

  // Timeline scale
  const [timeScale, setTimeScale] = useState<'week' | 'month'>('month');

  // Load saved views on mount
  useEffect(() => {
    setSavedViews(loadViews(entityType));
  }, [entityType]);

  // ---------------------------------------------------------------------------
  // Filter + sort logic (client-side on the data prop)
  // ---------------------------------------------------------------------------

  const filteredData = useMemo(() => {
    let result = [...data];
    for (const f of filters) {
      result = result.filter(row => {
        const val = String(row[f.field] ?? '').toLowerCase();
        const target = f.value.toLowerCase();
        switch (f.operator) {
          case 'eq': return val === target;
          case 'neq': return val !== target;
          case 'contains': return val.includes(target);
          case 'gt': return val > target;
          case 'lt': return val < target;
          default: return true;
        }
      });
    }
    if (sortBy) {
      result.sort((a, b) => {
        const av = String(a[sortBy.field] ?? '');
        const bv = String(b[sortBy.field] ?? '');
        const cmp = av.localeCompare(bv, undefined, { numeric: true });
        return sortBy.direction === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [data, filters, sortBy]);

  // Grouped data for board view
  const groupedData = useMemo(() => {
    const field = groupBy ?? (viewType === 'board' ? (entityType === 'tasks' ? 'status' : 'status') : undefined);
    if (!field) return null;
    const groups: Record<string, Record<string, unknown>[]> = {};
    for (const row of filteredData) {
      const key = String(row[field] ?? 'Unknown');
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }
    return groups;
  }, [filteredData, groupBy, viewType, entityType]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSaveView = useCallback(() => {
    const config: ViewConfig = {
      id: crypto.randomUUID(),
      name: viewName || `${VIEW_LABELS[viewType]} view`,
      type: viewType,
      entityType,
      filters,
      sortBy,
      groupBy,
      visibleColumns,
    };
    saveView(config);
    setSavedViews(loadViews(entityType));
    setViewName('');
  }, [viewName, viewType, entityType, filters, sortBy, groupBy, visibleColumns]);

  const handleLoadView = useCallback((v: ViewConfig) => {
    setViewType(v.type);
    setFilters(v.filters);
    setSortBy(v.sortBy);
    setGroupBy(v.groupBy);
    setVisibleColumns(v.visibleColumns);
    setShowSavedViews(false);
  }, []);

  const handleDeleteView = useCallback((id: string) => {
    deleteView(entityType, id);
    setSavedViews(loadViews(entityType));
  }, [entityType]);

  const handleColumnSort = useCallback((field: string) => {
    setSortBy(prev => {
      if (prev?.field === field) {
        return prev.direction === 'asc' ? { field, direction: 'desc' } : undefined;
      }
      return { field, direction: 'asc' };
    });
  }, []);

  const toggleRowSelection = useCallback((id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAllRows = useCallback(() => {
    if (selectedRows.size === filteredData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredData.map(r => String(r.id))));
    }
  }, [selectedRows.size, filteredData]);

  // Column resize
  const handleResizeStart = useCallback((col: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startW = columnWidths[col] ?? 150;
    resizingRef.current = { col, startX: e.clientX, startW };

    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const diff = ev.clientX - resizingRef.current.startX;
      setColumnWidths(prev => ({ ...prev, [resizingRef.current!.col]: Math.max(60, resizingRef.current!.startW + diff) }));
    };
    const onUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [columnWidths]);

  // Add filter row
  const addFilter = useCallback(() => {
    setFilters(prev => [...prev, { field: allColumnDefs[0]?.key ?? '', operator: 'contains', value: '' }]);
    setShowFilters(true);
  }, [allColumnDefs]);

  const updateFilter = useCallback((idx: number, patch: Partial<ViewFilter>) => {
    setFilters(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));
  }, []);

  const removeFilter = useCallback((idx: number) => {
    setFilters(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ---------------------------------------------------------------------------
  // Cell renderer
  // ---------------------------------------------------------------------------

  function renderCell(row: Record<string, unknown>, colKey: string): React.ReactNode {
    const val = row[colKey];
    const colDef = allColumnDefs.find(c => c.key === colKey);

    if (colDef?.type === 'status') {
      const s = String(val ?? '');
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-light">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[s] ?? 'rgba(255,255,255,0.2)' }} />
          {s.toLowerCase().replace(/_/g, ' ')}
        </span>
      );
    }
    if (colDef?.type === 'priority') {
      const p = String(val ?? '');
      return (
        <span className="text-xs font-light" style={{ color: PRIORITY_COLORS[p] ?? 'rgba(255,255,255,0.4)' }}>
          {p.toLowerCase()}
        </span>
      );
    }
    if (colDef?.type === 'date' && val) {
      return <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>{new Date(String(val)).toLocaleDateString()}</span>;
    }
    if (colDef?.type === 'number' && val !== null && val !== undefined) {
      return <span className="text-xs font-light tabular-nums">{String(val)}</span>;
    }
    if (val === null || val === undefined) {
      return <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>--</span>;
    }
    return <span className="text-xs font-light truncate">{String(val)}</span>;
  }

  // Title field for the entity
  const titleField = entityType === 'workflows' || entityType === 'systems' ? 'name' : 'title';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full">
      {/* View bar */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* View type tabs */}
          <div className="flex items-center rounded-xl overflow-hidden" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
            {(['table', 'board', 'gallery', 'timeline'] as ViewType[]).map(vt => {
              const Icon = VIEW_ICONS[vt];
              const active = viewType === vt;
              return (
                <button
                  key={vt}
                  onClick={() => setViewType(vt)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-light transition-all"
                  style={{
                    background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  <Icon active={active} />
                  {VIEW_LABELS[vt]}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => setShowFilters(f => !f)}
              className="px-3 py-1.5 text-xs font-light rounded-lg transition-all"
              style={{
                background: filters.length > 0 ? 'rgba(113,147,237,0.15)' : 'rgba(255,255,255,0.04)',
                border: '1px solid var(--glass-border)',
                color: filters.length > 0 ? '#7193ED' : 'rgba(255,255,255,0.5)',
              }}
            >
              Filter{filters.length > 0 ? ` (${filters.length})` : ''}
            </button>

            <button
              onClick={() => setShowSort(s => !s)}
              className="px-3 py-1.5 text-xs font-light rounded-lg transition-all"
              style={{
                background: sortBy ? 'rgba(113,147,237,0.15)' : 'rgba(255,255,255,0.04)',
                border: '1px solid var(--glass-border)',
                color: sortBy ? '#7193ED' : 'rgba(255,255,255,0.5)',
              }}
            >
              Sort{sortBy ? ` (${sortBy.field})` : ''}
            </button>

            {groupableFields.length > 0 && (
              <button
                onClick={() => setShowGroup(g => !g)}
                className="px-3 py-1.5 text-xs font-light rounded-lg transition-all"
                style={{
                  background: groupBy ? 'rgba(113,147,237,0.15)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--glass-border)',
                  color: groupBy ? '#7193ED' : 'rgba(255,255,255,0.5)',
                }}
              >
                Group{groupBy ? `: ${groupBy}` : ''}
              </button>
            )}

            {viewType === 'table' && (
              <button
                onClick={() => setShowColumnPicker(c => !c)}
                className="px-2 py-1.5 text-xs rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.5)' }}
                title="Toggle columns"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>
              </button>
            )}

            {/* Saved views dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSavedViews(s => !s)}
                className="px-3 py-1.5 text-xs font-light rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.5)' }}
              >
                Views ({savedViews.length})
              </button>
              {showSavedViews && (
                <div
                  className="absolute right-0 top-full mt-1 w-64 rounded-xl p-3 z-50 space-y-1"
                  style={{ background: 'var(--glass-deep, rgba(15,15,20,0.95))', border: '1px solid var(--glass-border)', backdropFilter: 'blur(20px)' }}
                >
                  {savedViews.length === 0 && (
                    <p className="text-xs font-light py-2 text-center" style={{ color: 'var(--text-3)' }}>No saved views</p>
                  )}
                  {savedViews.map(v => (
                    <div key={v.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all">
                      <button onClick={() => handleLoadView(v)} className="text-xs font-light truncate flex-1 text-left" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {v.name}
                      </button>
                      <button onClick={() => handleDeleteView(v.id)} className="text-xs ml-2 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>x</button>
                    </div>
                  ))}
                  <div className="pt-2 mt-1" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <div className="flex items-center gap-1.5">
                      <input
                        value={viewName}
                        onChange={e => setViewName(e.target.value)}
                        placeholder="View name..."
                        className="flex-1 text-xs font-light bg-transparent px-2 py-1 rounded-lg outline-none"
                        style={{ border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)' }}
                      />
                      <button onClick={handleSaveView} className="text-xs font-light px-2 py-1 rounded-lg" style={{ background: 'rgba(113,147,237,0.2)', color: '#7193ED' }}>
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compact view toggle for system pages */}
      {compact && (
        <div className="flex items-center gap-1 mb-3">
          {(['table', 'board'] as ViewType[]).map(vt => {
            const Icon = VIEW_ICONS[vt];
            const active = viewType === vt;
            return (
              <button
                key={vt}
                onClick={() => setViewType(vt)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-light rounded-lg transition-all"
                style={{ background: active ? 'rgba(255,255,255,0.06)' : 'transparent', color: active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}
              >
                <Icon active={active} />
                {VIEW_LABELS[vt]}
              </button>
            );
          })}
        </div>
      )}

      {/* Filter panel */}
      {showFilters && !compact && (
        <div className="mb-3 p-3 rounded-xl space-y-2" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          {filters.map((f, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={f.field}
                onChange={e => updateFilter(idx, { field: e.target.value })}
                className="text-xs font-light bg-transparent px-2 py-1.5 rounded-lg outline-none appearance-none"
                style={{ border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)', minWidth: 100 }}
              >
                {allColumnDefs.map(c => <option key={c.key} value={c.key} style={{ background: '#1a1a2e' }}>{c.label}</option>)}
              </select>
              <select
                value={f.operator}
                onChange={e => updateFilter(idx, { operator: e.target.value as ViewFilter['operator'] })}
                className="text-xs font-light bg-transparent px-2 py-1.5 rounded-lg outline-none appearance-none"
                style={{ border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)', minWidth: 80 }}
              >
                {Object.entries(OPERATOR_LABELS).map(([k, label]) => (
                  <option key={k} value={k} style={{ background: '#1a1a2e' }}>{label}</option>
                ))}
              </select>
              <input
                value={f.value}
                onChange={e => updateFilter(idx, { value: e.target.value })}
                placeholder="value..."
                className="flex-1 text-xs font-light bg-transparent px-2 py-1.5 rounded-lg outline-none"
                style={{ border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)' }}
              />
              <button onClick={() => removeFilter(idx)} className="text-xs px-1" style={{ color: 'rgba(255,255,255,0.3)' }}>x</button>
            </div>
          ))}
          <button onClick={addFilter} className="text-xs font-light" style={{ color: '#7193ED' }}>+ Add filter</button>
        </div>
      )}

      {/* Sort panel */}
      {showSort && !compact && (
        <div className="mb-3 p-3 rounded-xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-2">
            <select
              value={sortBy?.field ?? ''}
              onChange={e => setSortBy(e.target.value ? { field: e.target.value, direction: sortBy?.direction ?? 'asc' } : undefined)}
              className="text-xs font-light bg-transparent px-2 py-1.5 rounded-lg outline-none appearance-none"
              style={{ border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)' }}
            >
              <option value="" style={{ background: '#1a1a2e' }}>None</option>
              {allColumnDefs.map(c => <option key={c.key} value={c.key} style={{ background: '#1a1a2e' }}>{c.label}</option>)}
            </select>
            {sortBy && (
              <button
                onClick={() => setSortBy(prev => prev ? { ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : prev)}
                className="text-xs font-light px-2 py-1.5 rounded-lg"
                style={{ border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.6)' }}
              >
                {sortBy.direction === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Group panel */}
      {showGroup && !compact && (
        <div className="mb-3 p-3 rounded-xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-2">
            <select
              value={groupBy ?? ''}
              onChange={e => setGroupBy(e.target.value || undefined)}
              className="text-xs font-light bg-transparent px-2 py-1.5 rounded-lg outline-none appearance-none"
              style={{ border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)' }}
            >
              <option value="" style={{ background: '#1a1a2e' }}>No grouping</option>
              {groupableFields.map(f => {
                const def = allColumnDefs.find(c => c.key === f);
                return <option key={f} value={f} style={{ background: '#1a1a2e' }}>{def?.label ?? f}</option>;
              })}
            </select>
          </div>
        </div>
      )}

      {/* Column picker */}
      {showColumnPicker && !compact && (
        <div className="mb-3 p-3 rounded-xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <div className="flex flex-wrap gap-2">
            {allColumnDefs.map(c => {
              const active = visibleColumns.includes(c.key);
              return (
                <button
                  key={c.key}
                  onClick={() => setVisibleColumns(prev => active ? prev.filter(k => k !== c.key) : [...prev, c.key])}
                  className="text-xs font-light px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: active ? 'rgba(113,147,237,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? 'rgba(113,147,237,0.3)' : 'var(--glass-border)'}`,
                    color: active ? '#7193ED' : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No data state */}
      {filteredData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl" style={{ border: '1px dashed var(--glass-border)' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No records found</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Try adjusting your filters</p>
        </div>
      )}

      {/* Table view */}
      {viewType === 'table' && filteredData.length > 0 && (
        <TableView
          data={filteredData}
          visibleColumns={visibleColumns}
          allColumnDefs={allColumnDefs}
          columnWidths={columnWidths}
          sortBy={sortBy}
          selectedRows={selectedRows}
          editingCell={editingCell}
          onSort={handleColumnSort}
          onResizeStart={handleResizeStart}
          onToggleRow={toggleRowSelection}
          onToggleAll={toggleAllRows}
          onEditCell={setEditingCell}
          renderCell={renderCell}
          titleField={titleField}
        />
      )}

      {/* Board view */}
      {viewType === 'board' && filteredData.length > 0 && (
        <BoardView
          data={filteredData}
          groupedData={groupedData}
          entityType={entityType}
          groupBy={groupBy}
          renderCell={renderCell}
          titleField={titleField}
          allColumnDefs={allColumnDefs}
        />
      )}

      {/* Gallery view */}
      {viewType === 'gallery' && filteredData.length > 0 && (
        <GalleryView data={filteredData} entityType={entityType} renderCell={renderCell} titleField={titleField} allColumnDefs={allColumnDefs} />
      )}

      {/* Timeline view */}
      {viewType === 'timeline' && filteredData.length > 0 && (
        <TimelineView data={filteredData} timeScale={timeScale} setTimeScale={setTimeScale} titleField={titleField} />
      )}

      {/* Row count */}
      {filteredData.length > 0 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}
            {selectedRows.size > 0 ? ` / ${selectedRows.size} selected` : ''}
          </p>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// TABLE VIEW
// ===========================================================================

type TableViewProps = {
  data: Record<string, unknown>[];
  visibleColumns: string[];
  allColumnDefs: { key: string; label: string; type: string }[];
  columnWidths: Record<string, number>;
  sortBy?: { field: string; direction: 'asc' | 'desc' };
  selectedRows: Set<string>;
  editingCell: { row: number; col: string } | null;
  onSort: (field: string) => void;
  onResizeStart: (col: string, e: React.MouseEvent) => void;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  onEditCell: (cell: { row: number; col: string } | null) => void;
  renderCell: (row: Record<string, unknown>, col: string) => React.ReactNode;
  titleField: string;
};

function TableView({
  data, visibleColumns, allColumnDefs, columnWidths, sortBy,
  selectedRows, editingCell, onSort, onResizeStart, onToggleRow, onToggleAll,
  onEditCell, renderCell, titleField,
}: TableViewProps) {
  return (
    <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--glass-border)' }}>
      <table className="w-full border-collapse" style={{ minWidth: 600 }}>
        <thead>
          <tr style={{ background: 'var(--glass)' }}>
            <th className="w-10 px-3 py-2.5 text-left" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <input
                type="checkbox"
                checked={selectedRows.size === data.length && data.length > 0}
                onChange={onToggleAll}
                className="accent-[#7193ED] w-3.5 h-3.5"
                style={{ opacity: 0.6 }}
              />
            </th>
            {visibleColumns.map(colKey => {
              const def = allColumnDefs.find(c => c.key === colKey);
              const isSorted = sortBy?.field === colKey;
              const w = columnWidths[colKey];
              return (
                <th
                  key={colKey}
                  className="px-3 py-2.5 text-left relative select-none"
                  style={{
                    borderBottom: '1px solid var(--glass-border)',
                    width: w ? `${w}px` : undefined,
                    minWidth: 60,
                  }}
                >
                  <button
                    onClick={() => onSort(colKey)}
                    className="flex items-center gap-1 text-xs font-light tracking-wide uppercase transition-colors"
                    style={{ color: isSorted ? 'rgba(255,255,255,0.8)' : 'var(--text-3)' }}
                  >
                    {def?.label ?? colKey}
                    {isSorted && (
                      <span className="text-[10px]">{sortBy?.direction === 'asc' ? '\u2191' : '\u2193'}</span>
                    )}
                  </button>
                  {/* Resize handle */}
                  <div
                    onMouseDown={e => onResizeStart(colKey, e)}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-white/10 transition-colors"
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => {
            const id = String(row.id ?? rowIdx);
            const isSelected = selectedRows.has(id);
            return (
              <tr
                key={id}
                className="group transition-colors"
                style={{
                  background: isSelected ? 'rgba(113,147,237,0.06)' : rowIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                }}
              >
                <td className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleRow(id)}
                    className="accent-[#7193ED] w-3.5 h-3.5"
                    style={{ opacity: 0.5 }}
                  />
                </td>
                {visibleColumns.map(colKey => {
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === colKey;
                  const isTitle = colKey === titleField;
                  return (
                    <td
                      key={colKey}
                      className="px-3 py-2 cursor-default"
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        maxWidth: 300,
                      }}
                      onDoubleClick={() => onEditCell({ row: rowIdx, col: colKey })}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={String(row[colKey] ?? '')}
                          onBlur={() => onEditCell(null)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') onEditCell(null); }}
                          className="w-full text-xs font-light bg-transparent outline-none px-1 py-0.5 rounded"
                          style={{ border: '1px solid #7193ED', color: 'rgba(255,255,255,0.9)' }}
                        />
                      ) : (
                        <div className={isTitle ? 'font-normal text-xs' : ''} style={isTitle ? { color: 'rgba(255,255,255,0.85)' } : undefined}>
                          {renderCell(row, colKey)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ===========================================================================
// BOARD VIEW
// ===========================================================================

type BoardViewProps = {
  data: Record<string, unknown>[];
  groupedData: Record<string, Record<string, unknown>[]> | null;
  entityType: EntityType;
  groupBy?: string;
  renderCell: (row: Record<string, unknown>, col: string) => React.ReactNode;
  titleField: string;
  allColumnDefs: { key: string; label: string; type: string }[];
};

function BoardView({ data, groupedData, entityType, groupBy, renderCell, titleField, allColumnDefs }: BoardViewProps) {
  // Auto-group by status if no explicit groupBy
  const groups = groupedData ?? (() => {
    const g: Record<string, Record<string, unknown>[]> = {};
    for (const row of data) {
      const key = String(row.status ?? 'Unknown');
      if (!g[key]) g[key] = [];
      g[key].push(row);
    }
    return g;
  })();

  const secondaryFields = allColumnDefs.filter(c => c.key !== titleField && c.key !== 'id' && c.key !== (groupBy ?? 'status')).slice(0, 3);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 200 }}>
      {Object.entries(groups).map(([group, rows]) => (
        <div key={group} className="flex-shrink-0 w-72 rounded-2xl overflow-hidden" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          {/* Column header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[group] ?? 'rgba(255,255,255,0.3)' }} />
              <span className="text-xs font-light tracking-wide uppercase" style={{ color: 'var(--text-2)' }}>
                {group.toLowerCase().replace(/_/g, ' ')}
              </span>
            </div>
            <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>{rows.length}</span>
          </div>
          {/* Cards */}
          <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
            {rows.map((row, i) => (
              <div
                key={String(row.id ?? i)}
                className="p-3 rounded-xl transition-all hover:bg-white/5"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <p className="text-xs font-normal mb-2" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {String(row[titleField] ?? '')}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {secondaryFields.map(f => (
                    <div key={f.key}>
                      {renderCell(row, f.key)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===========================================================================
// GALLERY VIEW
// ===========================================================================

type GalleryViewProps = {
  data: Record<string, unknown>[];
  entityType: EntityType;
  renderCell: (row: Record<string, unknown>, col: string) => React.ReactNode;
  titleField: string;
  allColumnDefs: { key: string; label: string; type: string }[];
};

function GalleryView({ data, entityType, renderCell, titleField, allColumnDefs }: GalleryViewProps) {
  const detailFields = allColumnDefs.filter(c => c.key !== titleField && c.key !== 'id').slice(0, 4);
  // Color accent based on status or priority
  const accentField = allColumnDefs.find(c => c.type === 'status')?.key;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {data.map((row, i) => {
        const accent = accentField ? STATUS_COLORS[String(row[accentField] ?? '')] : undefined;
        return (
          <div
            key={String(row.id ?? i)}
            className="rounded-2xl p-4 transition-all hover:scale-[1.01] hover:bg-white/5"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              borderTop: accent ? `2px solid ${accent}` : undefined,
            }}
          >
            <p className="text-sm font-light mb-3 truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {String(row[titleField] ?? '')}
            </p>
            <div className="space-y-2">
              {detailFields.map(f => (
                <div key={f.key} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{f.label}</span>
                  {renderCell(row, f.key)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===========================================================================
// TIMELINE VIEW
// ===========================================================================

type TimelineViewProps = {
  data: Record<string, unknown>[];
  timeScale: 'week' | 'month';
  setTimeScale: (s: 'week' | 'month') => void;
  titleField: string;
};

function TimelineView({ data, timeScale, setTimeScale, titleField }: TimelineViewProps) {
  // Parse dates from records
  const items = useMemo(() => {
    return data.map(row => {
      const start = row.createdAt ? new Date(String(row.createdAt)) : null;
      const end = row.completedAt ? new Date(String(row.completedAt)) : row.dueDate ? new Date(String(row.dueDate)) : null;
      const status = String(row.status ?? '');
      return {
        id: String(row.id ?? ''),
        title: String(row[titleField] ?? ''),
        start,
        end,
        status,
      };
    }).filter(item => item.start !== null) as { id: string; title: string; start: Date; end: Date | null; status: string }[];
  }, [data, titleField]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-2xl" style={{ border: '1px dashed var(--glass-border)' }}>
        <p className="text-sm font-light" style={{ color: 'var(--text-2)' }}>No date data available for timeline</p>
      </div>
    );
  }

  // Find time range
  const allDates = items.flatMap(i => [i.start, i.end].filter(Boolean)) as Date[];
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

  // Extend range slightly
  const rangeStart = new Date(minDate);
  rangeStart.setDate(rangeStart.getDate() - 7);
  const rangeEnd = new Date(maxDate);
  rangeEnd.setDate(rangeEnd.getDate() + 14);

  const totalDays = Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)));
  const dayWidth = timeScale === 'week' ? 24 : 8;
  const totalWidth = totalDays * dayWidth;

  // Generate month/week markers
  const markers: { label: string; offset: number }[] = [];
  const cursor = new Date(rangeStart);
  if (timeScale === 'month') {
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() + 1);
    while (cursor <= rangeEnd) {
      const offset = Math.ceil((cursor.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
      markers.push({ label: cursor.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }), offset });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    // Weekly markers
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + (7 - d.getDay()));
    while (d <= rangeEnd) {
      const offset = Math.ceil((d.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
      markers.push({ label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), offset });
      d.setDate(d.getDate() + 7);
    }
  }

  return (
    <div>
      {/* Scale toggle */}
      <div className="flex items-center gap-1.5 mb-3">
        {(['week', 'month'] as const).map(s => (
          <button
            key={s}
            onClick={() => setTimeScale(s)}
            className="text-xs font-light px-2.5 py-1 rounded-lg transition-all"
            style={{
              background: timeScale === s ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: timeScale === s ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
            }}
          >
            {s === 'week' ? 'Weekly' : 'Monthly'}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--glass-border)' }}>
        <div className="relative" style={{ width: totalWidth, minHeight: items.length * 36 + 40 }}>
          {/* Header with markers */}
          <div className="sticky top-0 h-8 flex items-end" style={{ background: 'var(--glass)', borderBottom: '1px solid var(--glass-border)', zIndex: 2 }}>
            {markers.map((m, i) => (
              <div key={i} className="absolute text-[10px] font-light" style={{ left: m.offset, color: 'var(--text-3)', transform: 'translateX(-50%)' }}>
                {m.label}
              </div>
            ))}
          </div>

          {/* Vertical grid lines */}
          {markers.map((m, i) => (
            <div key={i} className="absolute top-8 bottom-0 w-px" style={{ left: m.offset, background: 'rgba(255,255,255,0.03)' }} />
          ))}

          {/* Items */}
          {items.map((item, idx) => {
            const startOffset = Math.max(0, Math.ceil((item.start.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))) * dayWidth;
            const endDate = item.end ?? item.start;
            const duration = Math.max(1, Math.ceil((endDate.getTime() - item.start.getTime()) / (1000 * 60 * 60 * 24)));
            const barWidth = Math.max(dayWidth * 2, duration * dayWidth);
            const color = STATUS_COLORS[item.status] ?? 'rgba(113,147,237,0.6)';

            return (
              <div
                key={item.id}
                className="absolute flex items-center group"
                style={{ top: 40 + idx * 36, left: startOffset, height: 28 }}
              >
                <div
                  className="h-5 rounded-md flex items-center px-2 transition-all group-hover:opacity-100"
                  style={{
                    width: barWidth,
                    background: `${color}30`,
                    border: `1px solid ${color}50`,
                    opacity: 0.85,
                  }}
                >
                  <span className="text-[10px] font-light truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {item.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
