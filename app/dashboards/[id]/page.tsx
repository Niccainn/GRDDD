'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getDashboardById,
  saveDashboard,
  getDefaultDashboard,
  genWidgetId,
  WIDGET_CATALOG,
  type CustomDashboard,
  type Widget,
  type WidgetType,
} from '@/lib/dashboards';

import StatWidget from '@/components/dashboard/StatWidget';
import ChartWidget from '@/components/dashboard/ChartWidget';
import ListWidget from '@/components/dashboard/ListWidget';
import ProgressWidget from '@/components/dashboard/ProgressWidget';
import ActivityWidget from '@/components/dashboard/ActivityWidget';
import TasksWidget from '@/components/dashboard/TasksWidget';
import GoalsWidget from '@/components/dashboard/GoalsWidget';
import TextWidget from '@/components/dashboard/TextWidget';
import ExecutionsWidget from '@/components/dashboard/ExecutionsWidget';
import EmbedWidget from '@/components/dashboard/EmbedWidget';

const GRID_COLS = 12;
const ROW_HEIGHT = 80;
const GAP = 8;
const PALETTE_WIDTH = 250;

function WidgetRenderer({ widget }: { widget: Widget }) {
  switch (widget.type) {
    case 'stat': return <StatWidget widget={widget} />;
    case 'chart': return <ChartWidget widget={widget} />;
    case 'list': return <ListWidget widget={widget} />;
    case 'progress': return <ProgressWidget widget={widget} />;
    case 'activity': return <ActivityWidget widget={widget} />;
    case 'tasks': return <TasksWidget widget={widget} />;
    case 'goals': return <GoalsWidget widget={widget} />;
    case 'text': return <TextWidget widget={widget} />;
    case 'executions': return <ExecutionsWidget widget={widget} />;
    case 'embed': return <EmbedWidget widget={widget} />;
    default: return <div className="p-4 text-xs" style={{ color: 'var(--text-3)' }}>Unknown widget</div>;
  }
}

/** Find the next available grid position */
function findNextPosition(widgets: Widget[], w: number, h: number): { x: number; y: number } {
  const occupied = new Set<string>();
  widgets.forEach((wg) => {
    for (let row = wg.position.y; row < wg.position.y + wg.position.h; row++) {
      for (let col = wg.position.x; col < wg.position.x + wg.position.w; col++) {
        occupied.add(`${col},${row}`);
      }
    }
  });

  for (let row = 0; row < 100; row++) {
    for (let col = 0; col <= GRID_COLS - w; col++) {
      let fits = true;
      for (let dy = 0; dy < h && fits; dy++) {
        for (let dx = 0; dx < w && fits; dx++) {
          if (occupied.has(`${col + dx},${row + dy}`)) fits = false;
        }
      }
      if (fits) return { x: col, y: row };
    }
  }
  return { x: 0, y: 0 };
}

export default function DashboardEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [dashboard, setDashboard] = useState<CustomDashboard | null>(null);
  const [editing, setEditing] = useState(false);
  const [configWidget, setConfigWidget] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Drag state
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  // Resize state
  const [resizing, setResizing] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let db = getDashboardById(id);
    if (!db && id === 'default') {
      db = getDefaultDashboard();
    }
    if (!db) {
      router.push('/dashboards');
      return;
    }
    setDashboard(db);
    setNameInput(db.name);
  }, [id, router]);

  const save = useCallback((db: CustomDashboard) => {
    const saved = saveDashboard(db);
    setDashboard(saved);
  }, []);

  // Add widget from palette
  function addWidget(type: WidgetType) {
    if (!dashboard) return;
    const catalogItem = WIDGET_CATALOG.find((c) => c.type === type);
    const w = catalogItem?.defaultW ?? 3;
    const h = catalogItem?.defaultH ?? 2;
    const pos = findNextPosition(dashboard.widgets, w, h);

    const newWidget: Widget = {
      id: genWidgetId(),
      type,
      title: catalogItem?.label ?? type,
      config: getDefaultConfig(type),
      position: { x: pos.x, y: pos.y, w, h },
    };

    const updated = { ...dashboard, widgets: [...dashboard.widgets, newWidget] };
    save(updated);
  }

  function getDefaultConfig(type: WidgetType): Record<string, any> {
    switch (type) {
      case 'stat': return { metric: 'totalTasks', color: '#7193ED' };
      case 'chart': return { dataSource: 'executions', chartType: 'bar', timeRange: '7d' };
      case 'list': return { entityType: 'executions', limit: 5, sort: 'recent' };
      case 'progress': return { metric: 'goalProgress', color: '#15AD70' };
      case 'activity': return { limit: 8 };
      case 'tasks': return { statusFilter: 'all', limit: 5 };
      case 'goals': return { limit: 4 };
      case 'executions': return { limit: 5, statusFilter: 'all' };
      case 'text': return { content: '## Welcome\n\nEdit this text in the config panel.' };
      case 'embed': return { url: '' };
      default: return {};
    }
  }

  function removeWidget(widgetId: string) {
    if (!dashboard) return;
    const updated = { ...dashboard, widgets: dashboard.widgets.filter((w) => w.id !== widgetId) };
    save(updated);
    if (configWidget === widgetId) setConfigWidget(null);
  }

  function updateWidgetConfig(widgetId: string, config: Record<string, any>) {
    if (!dashboard) return;
    const updated = {
      ...dashboard,
      widgets: dashboard.widgets.map((w) =>
        w.id === widgetId ? { ...w, config: { ...w.config, ...config } } : w
      ),
    };
    save(updated);
  }

  function updateWidgetTitle(widgetId: string, title: string) {
    if (!dashboard) return;
    const updated = {
      ...dashboard,
      widgets: dashboard.widgets.map((w) =>
        w.id === widgetId ? { ...w, title } : w
      ),
    };
    save(updated);
  }

  // Grid calculations
  function getGridMetrics() {
    if (!gridRef.current) return { colW: 80, left: 0 };
    const rect = gridRef.current.getBoundingClientRect();
    const availW = rect.width;
    const colW = (availW - GAP * (GRID_COLS - 1)) / GRID_COLS;
    return { colW, left: rect.left };
  }

  // Drag handlers
  function handleDragStart(e: React.MouseEvent, widgetId: string) {
    if (!editing) return;
    e.preventDefault();
    const widget = dashboard?.widgets.find((w) => w.id === widgetId);
    if (!widget) return;

    const { colW, left } = getGridMetrics();
    const widgetLeft = widget.position.x * (colW + GAP);
    const widgetTop = widget.position.y * (ROW_HEIGHT + GAP);

    setDragging(widgetId);
    setDragOffset({
      x: e.clientX - left - widgetLeft,
      y: e.clientY - (gridRef.current?.getBoundingClientRect().top ?? 0) - widgetTop,
    });
    setDragPos({ x: widget.position.x, y: widget.position.y });

    function onMove(ev: MouseEvent) {
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const { colW: cw } = getGridMetrics();
      const rawX = ev.clientX - rect.left - dragOffset.x;
      const rawY = ev.clientY - rect.top - dragOffset.y;
      const snapX = Math.max(0, Math.min(GRID_COLS - widget!.position.w, Math.round(rawX / (cw + GAP))));
      const snapY = Math.max(0, Math.round(rawY / (ROW_HEIGHT + GAP)));
      setDragPos({ x: snapX, y: snapY });
    }

    function onUp() {
      setDragging(null);
      // Apply final position
      setDashboard((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          widgets: prev.widgets.map((w) => {
            if (w.id !== widgetId) return w;
            return { ...w, position: { ...w.position, x: dragPos.x, y: dragPos.y } };
          }),
        };
        saveDashboard(updated);
        return updated;
      });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // We need a ref-based approach for drag since closures capture stale state
  const dragPosRef = useRef(dragPos);
  dragPosRef.current = dragPos;

  function handleDragStartRef(e: React.MouseEvent, widgetId: string) {
    if (!editing || !gridRef.current) return;
    e.preventDefault();
    const widget = dashboard?.widgets.find((w) => w.id === widgetId);
    if (!widget) return;

    const rect = gridRef.current.getBoundingClientRect();
    const { colW } = getGridMetrics();
    const widgetLeft = widget.position.x * (colW + GAP);
    const widgetTop = widget.position.y * (ROW_HEIGHT + GAP);
    const offX = e.clientX - rect.left - widgetLeft;
    const offY = e.clientY - rect.top - widgetTop;

    setDragging(widgetId);
    setDragPos({ x: widget.position.x, y: widget.position.y });

    function onMove(ev: MouseEvent) {
      if (!gridRef.current) return;
      const r = gridRef.current.getBoundingClientRect();
      const gm = getGridMetrics();
      const rawX = ev.clientX - r.left - offX;
      const rawY = ev.clientY - r.top - offY;
      const snapX = Math.max(0, Math.min(GRID_COLS - widget!.position.w, Math.round(rawX / (gm.colW + GAP))));
      const snapY = Math.max(0, Math.round(rawY / (ROW_HEIGHT + GAP)));
      setDragPos({ x: snapX, y: snapY });
      dragPosRef.current = { x: snapX, y: snapY };
    }

    function onUp() {
      const finalPos = dragPosRef.current;
      setDragging(null);
      setDashboard((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          widgets: prev.widgets.map((w) => {
            if (w.id !== widgetId) return w;
            return { ...w, position: { ...w.position, x: finalPos.x, y: finalPos.y } };
          }),
        };
        saveDashboard(updated);
        return updated;
      });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Resize handlers
  const resizeSizeRef = useRef({ w: 0, h: 0 });

  function handleResizeStart(e: React.MouseEvent, widgetId: string) {
    if (!editing || !gridRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const widget = dashboard?.widgets.find((w) => w.id === widgetId);
    if (!widget) return;

    const startX = e.clientX;
    const startY = e.clientY;
    setResizing(widgetId);
    setResizeStart({ x: startX, y: startY, w: widget.position.w, h: widget.position.h });
    resizeSizeRef.current = { w: widget.position.w, h: widget.position.h };

    function onMove(ev: MouseEvent) {
      const { colW } = getGridMetrics();
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const newW = Math.max(1, Math.min(GRID_COLS - widget!.position.x, Math.round(widget!.position.w + dx / (colW + GAP))));
      const newH = Math.max(1, Math.round(widget!.position.h + dy / (ROW_HEIGHT + GAP)));
      resizeSizeRef.current = { w: newW, h: newH };
      setResizeStart((prev) => ({ ...prev, w: newW, h: newH }));
    }

    function onUp() {
      const finalSize = resizeSizeRef.current;
      setResizing(null);
      setDashboard((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          widgets: prev.widgets.map((w) => {
            if (w.id !== widgetId) return w;
            return { ...w, position: { ...w.position, w: finalSize.w, h: finalSize.h } };
          }),
        };
        saveDashboard(updated);
        return updated;
      });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function handleRename() {
    if (!dashboard || !nameInput.trim()) return;
    const updated = { ...dashboard, name: nameInput.trim() };
    save(updated);
    setRenaming(false);
  }

  if (!dashboard) {
    return (
      <div className="px-10 py-10 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'var(--glass)' }} />
      </div>
    );
  }

  const maxRow = dashboard.widgets.reduce((m, w) => Math.max(m, w.position.y + w.position.h), 0);
  const gridHeight = Math.max(maxRow + 4, 10) * (ROW_HEIGHT + GAP);

  // Get widget currently being configured
  const configWg = configWidget ? dashboard.widgets.find((w) => w.id === configWidget) : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-10 py-6 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-4">
          <Link href="/dashboards" className="text-xs font-light transition-colors" style={{ color: 'var(--text-3)' }}>
            Dashboards
          </Link>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          {renaming ? (
            <input
              autoFocus
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
              onBlur={handleRename}
              className="bg-transparent text-sm font-light outline-none"
              style={{ color: 'var(--text-1)' }}
            />
          ) : (
            <button
              onClick={() => editing && setRenaming(true)}
              className="text-sm font-light"
              style={{ color: 'var(--text-1)' }}
            >
              {dashboard.name}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editing && (
            <span className="text-[10px] font-light px-2 py-1 rounded-full" style={{ color: '#F7C700', background: 'rgba(247,199,0,0.08)', border: '1px solid rgba(247,199,0,0.15)' }}>
              Editing
            </span>
          )}
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs font-light px-4 py-2 rounded-full transition-all"
            style={{
              background: editing ? 'rgba(21,173,112,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${editing ? 'rgba(21,173,112,0.2)' : 'var(--glass-border)'}`,
              color: editing ? '#15AD70' : 'var(--text-2)',
            }}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Widget palette (edit mode only) */}
        {editing && (
          <div
            className="flex-shrink-0 overflow-y-auto py-6 px-4"
            style={{
              width: PALETTE_WIDTH,
              borderRight: '1px solid var(--glass-border)',
              background: 'rgba(0,0,0,0.15)',
            }}
          >
            <p className="text-[10px] font-light tracking-[0.12em] mb-4 px-1" style={{ color: 'var(--text-3)' }}>
              ADD WIDGET
            </p>
            <div className="space-y-1.5">
              {WIDGET_CATALOG.map((item) => (
                <button
                  key={item.type}
                  onClick={() => addWidget(item.type)}
                  className="w-full text-left px-3 py-3 rounded-xl transition-all group"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono flex-shrink-0"
                      style={{ background: 'rgba(113,147,237,0.08)', border: '1px solid rgba(113,147,237,0.12)', color: 'rgba(113,147,237,0.6)' }}
                    >
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-light" style={{ color: 'var(--text-2)' }}>{item.label}</p>
                      <p className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>{item.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main grid area */}
        <div className="flex-1 overflow-auto px-8 py-6">
          <div
            ref={gridRef}
            className="relative w-full"
            style={{ height: gridHeight }}
          >
            {/* Grid guidelines (edit mode) */}
            {editing && Array.from({ length: GRID_COLS + 1 }).map((_, i) => (
              <div
                key={`guide-${i}`}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${(i / GRID_COLS) * 100}%`,
                  width: 1,
                  background: 'rgba(255,255,255,0.03)',
                }}
              />
            ))}

            {/* Widgets */}
            {dashboard.widgets.map((widget) => {
              const isDragging = dragging === widget.id;
              const isResizing = resizing === widget.id;
              const pos = isDragging ? dragPos : widget.position;
              const w = isResizing ? resizeStart.w : widget.position.w;
              const h = isResizing ? resizeStart.h : widget.position.h;

              const left = `calc(${(pos.x / GRID_COLS) * 100}% + ${GAP / 2}px)`;
              const top = pos.y * (ROW_HEIGHT + GAP);
              const width = `calc(${(w / GRID_COLS) * 100}% - ${GAP}px)`;
              const height = h * ROW_HEIGHT + (h - 1) * GAP;

              return (
                <div
                  key={widget.id}
                  className="absolute rounded-2xl overflow-hidden transition-shadow"
                  style={{
                    left,
                    top,
                    width,
                    height,
                    background: 'var(--glass)',
                    backdropFilter: 'blur(var(--glass-blur))',
                    WebkitBackdropFilter: 'blur(var(--glass-blur))',
                    border: `1px solid ${isDragging || isResizing ? 'rgba(113,147,237,0.3)' : 'var(--glass-border)'}`,
                    boxShadow: isDragging
                      ? '0 20px 60px rgba(0,0,0,0.5)'
                      : 'var(--glass-shadow-sm), var(--glass-inset)',
                    zIndex: isDragging || isResizing ? 50 : 1,
                    cursor: editing && !isResizing ? 'grab' : 'default',
                    transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s, border-color 0.2s',
                  }}
                  onMouseDown={(e) => editing && handleDragStartRef(e, widget.id)}
                >
                  {/* Widget content */}
                  <div className="h-full" style={{ pointerEvents: editing ? 'none' : 'auto' }}>
                    <WidgetRenderer widget={widget} />
                  </div>

                  {/* Edit mode overlay controls */}
                  {editing && (
                    <>
                      {/* Drag handle */}
                      <div
                        className="absolute top-2 left-2 w-5 h-5 rounded-md flex items-center justify-center cursor-grab"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <circle cx="2" cy="2" r="0.8" fill="rgba(255,255,255,0.3)" />
                          <circle cx="6" cy="2" r="0.8" fill="rgba(255,255,255,0.3)" />
                          <circle cx="2" cy="6" r="0.8" fill="rgba(255,255,255,0.3)" />
                          <circle cx="6" cy="6" r="0.8" fill="rgba(255,255,255,0.3)" />
                        </svg>
                      </div>

                      {/* Config button */}
                      <button
                        className="absolute top-2 right-8 w-5 h-5 rounded-md flex items-center justify-center transition-colors"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                        onMouseDown={(e) => { e.stopPropagation(); setConfigWidget(widget.id); }}
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <circle cx="4" cy="4" r="3" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
                          <circle cx="4" cy="4" r="1" fill="rgba(255,255,255,0.3)" />
                        </svg>
                      </button>

                      {/* Delete button */}
                      <button
                        className="absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center transition-colors"
                        style={{ background: 'rgba(255,107,107,0.1)' }}
                        onMouseDown={(e) => { e.stopPropagation(); removeWidget(widget.id); }}
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M2 2L6 6M6 2L2 6" stroke="#FF6B6B" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </button>

                      {/* Resize handle */}
                      <div
                        className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize"
                        onMouseDown={(e) => handleResizeStart(e, widget.id)}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" className="absolute bottom-0 right-0">
                          <path d="M8 2L2 8M8 5L5 8M8 8L8 8" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* Empty state */}
            {dashboard.widgets.length === 0 && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
                style={{ border: '1px dashed var(--glass-border)' }}
              >
                <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>
                  Empty dashboard
                </p>
                <p className="text-xs font-light mb-4" style={{ color: 'var(--text-3)' }}>
                  {editing ? 'Add widgets from the sidebar' : 'Click Edit to start adding widgets'}
                </p>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-xs font-light px-4 py-2 rounded-full transition-all"
                    style={{ background: 'rgba(113,147,237,0.08)', border: '1px solid rgba(113,147,237,0.2)', color: '#7193ED' }}
                  >
                    Edit dashboard
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Config panel (shown when a widget is selected in edit mode) */}
        {editing && configWg && (
          <div
            className="flex-shrink-0 overflow-y-auto py-6 px-4"
            style={{
              width: PALETTE_WIDTH,
              borderLeft: '1px solid var(--glass-border)',
              background: 'rgba(0,0,0,0.15)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-light tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>
                CONFIGURE
              </p>
              <button
                onClick={() => setConfigWidget(null)}
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M2 2L6 6M6 2L2 6" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Title */}
            <label className="block mb-3">
              <span className="text-[10px] font-light block mb-1" style={{ color: 'var(--text-3)' }}>Title</span>
              <input
                type="text"
                value={configWg.title}
                onChange={(e) => updateWidgetTitle(configWg.id, e.target.value)}
                className="w-full bg-transparent text-xs font-light px-3 py-2 rounded-lg outline-none"
                style={{ border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
              />
            </label>

            {/* Type-specific config */}
            <WidgetConfigPanel
              widget={configWg}
              onChange={(config) => updateWidgetConfig(configWg.id, config)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Config panel renders different inputs based on widget type */
function WidgetConfigPanel({ widget, onChange }: { widget: Widget; onChange: (config: Record<string, any>) => void }) {
  const config = widget.config;

  function renderInput(label: string, key: string, type: 'text' | 'number' | 'select', options?: { value: string; label: string }[]) {
    return (
      <label key={key} className="block mb-3">
        <span className="text-[10px] font-light block mb-1" style={{ color: 'var(--text-3)' }}>{label}</span>
        {type === 'select' && options ? (
          <select
            value={config[key] ?? ''}
            onChange={(e) => onChange({ [key]: e.target.value })}
            className="w-full bg-transparent text-xs font-light px-3 py-2 rounded-lg outline-none appearance-none"
            style={{ border: '1px solid var(--glass-border)', color: 'var(--text-1)', background: 'rgba(0,0,0,0.2)' }}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value} style={{ background: '#1a1a2e' }}>{o.label}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={config[key] ?? ''}
            onChange={(e) => onChange({ [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
            className="w-full bg-transparent text-xs font-light px-3 py-2 rounded-lg outline-none"
            style={{ border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
          />
        )}
      </label>
    );
  }

  switch (widget.type) {
    case 'stat':
      return (
        <div>
          {renderInput('Metric', 'metric', 'select', [
            { value: 'totalTasks', label: 'Total Tasks' },
            { value: 'completedTasks', label: 'Completed Tasks' },
            { value: 'activeTasks', label: 'Active Tasks' },
            { value: 'failedTasks', label: 'Failed Tasks' },
            { value: 'totalWorkflows', label: 'Total Workflows' },
            { value: 'activeWorkflows', label: 'Active Workflows' },
            { value: 'totalExecutions', label: 'Total Executions' },
            { value: 'successRate', label: 'Success Rate' },
            { value: 'totalGoals', label: 'Total Goals' },
            { value: 'goalProgress', label: 'Goal Progress' },
          ])}
          {renderInput('Color', 'color', 'text')}
        </div>
      );
    case 'chart':
      return (
        <div>
          {renderInput('Chart Type', 'chartType', 'select', [
            { value: 'bar', label: 'Bar Chart' },
            { value: 'line', label: 'Line Chart' },
          ])}
          {renderInput('Color', 'color', 'text')}
        </div>
      );
    case 'list':
    case 'tasks':
    case 'executions':
      return (
        <div>
          {renderInput('Limit', 'limit', 'number')}
          {renderInput('Status Filter', 'statusFilter', 'select', [
            { value: 'all', label: 'All' },
            { value: 'completed', label: 'Completed' },
            { value: 'running', label: 'Running' },
            { value: 'failed', label: 'Failed' },
          ])}
        </div>
      );
    case 'progress':
      return (
        <div>
          {renderInput('Metric', 'metric', 'select', [
            { value: 'goalProgress', label: 'Goal Progress' },
            { value: 'successRate', label: 'Success Rate' },
            { value: 'completedTasks', label: 'Task Completion' },
            { value: 'completedGoals', label: 'Goals Completed' },
          ])}
          {renderInput('Color', 'color', 'text')}
        </div>
      );
    case 'activity':
    case 'goals':
      return (
        <div>
          {renderInput('Limit', 'limit', 'number')}
        </div>
      );
    case 'text':
      return (
        <div>
          <label className="block mb-3">
            <span className="text-[10px] font-light block mb-1" style={{ color: 'var(--text-3)' }}>Content (Markdown)</span>
            <textarea
              value={config.content ?? ''}
              onChange={(e) => onChange({ content: e.target.value })}
              rows={8}
              className="w-full bg-transparent text-xs font-light px-3 py-2 rounded-lg outline-none resize-none"
              style={{ border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            />
          </label>
        </div>
      );
    case 'embed':
      return (
        <div>
          {renderInput('URL', 'url', 'text')}
        </div>
      );
    default:
      return <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>No config options</p>;
  }
}
