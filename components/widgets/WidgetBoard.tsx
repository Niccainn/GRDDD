'use client';
/**
 * WidgetBoard — the composition surface.
 *
 * Uses CanvasGrid for snap-layout: widgets live at integer cell
 * coordinates, drag + resize with pointer events (touch + mouse
 * unified), release snaps to cell and pushes neighbors down on
 * collision (iOS home-screen behavior).
 *
 * Persists two local maps per boardId:
 *   • user widget specs
 *   • layout { widgetId → {x,y,w,h} }
 *
 * Once Phase 6's Canvas model lands in the DB, this component
 * moves from localStorage to the Canvas table; widgets themselves
 * don't change.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import WidgetRenderer, { type WidgetRenderData } from './WidgetRenderer';
import WidgetDesigner from './WidgetDesigner';
import CanvasGrid, { type CanvasItem } from './CanvasGrid';
import { CELL, type WidgetSpec } from '@/lib/widgets/registry';
import { fetchWidgetData } from '@/lib/widgets/fetch';
import { type Layout } from '@/lib/widgets/canvas';

export type BoardData = Record<string, WidgetRenderData | undefined>;

type Props = {
  boardId: string;
  /** Widgets shipped by the app (dashboard defaults, system page defaults). */
  systemSpecs: WidgetSpec[];
  /** Data keyed by widget id, or by a stable key the caller maps to ids. */
  data: BoardData;
  /** If true, the designer "+" tile appears at the end. */
  allowAdd?: boolean;
  /** Column count for the snap grid. Defaults to 4. */
  cols?: number;
};

function loadUserWidgets(boardId: string): WidgetSpec[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`grid_widgets_${boardId}`);
    return raw ? (JSON.parse(raw) as WidgetSpec[]) : [];
  } catch {
    return [];
  }
}

function saveUserWidgets(boardId: string, widgets: WidgetSpec[]) {
  try {
    localStorage.setItem(`grid_widgets_${boardId}`, JSON.stringify(widgets));
  } catch {
    /* quota exceeded or private mode — non-fatal */
  }
}

function loadLayout(boardId: string): Layout {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`grid_layout_${boardId}`);
    return raw ? (JSON.parse(raw) as Layout) : {};
  } catch {
    return {};
  }
}

function saveLayout(boardId: string, layout: Layout) {
  try {
    localStorage.setItem(`grid_layout_${boardId}`, JSON.stringify(layout));
  } catch {
    /* non-fatal */
  }
}

export default function WidgetBoard({
  boardId,
  systemSpecs,
  data,
  allowAdd = true,
  cols = 4,
}: Props) {
  const [userSpecs, setUserSpecs] = useState<WidgetSpec[]>([]);
  const [userData, setUserData] = useState<BoardData>({});
  const [layout, setLayout] = useState<Layout>({});
  const [designerOpen, setDesignerOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState(false);

  useEffect(() => {
    setUserSpecs(loadUserWidgets(boardId));
    setLayout(loadLayout(boardId));
  }, [boardId]);

  // Live data for user widgets. Re-fetches when specs change, then
  // refreshes per spec.refresh.
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setInterval>[] = [];

    async function resolve(spec: WidgetSpec) {
      const d = await fetchWidgetData(spec.source);
      if (cancelled) return;
      setUserData(prev => ({ ...prev, [spec.id]: d }));
    }

    for (const spec of userSpecs) {
      resolve(spec);
      if (spec.refresh.mode === 'interval') {
        const ms = Math.max(15, spec.refresh.seconds) * 1000;
        timers.push(setInterval(() => resolve(spec), ms));
      }
    }

    return () => {
      cancelled = true;
      for (const t of timers) clearInterval(t);
    };
  }, [userSpecs]);

  const addWidget = useCallback(
    (spec: WidgetSpec) => {
      setUserSpecs(prev => {
        const next = [...prev, spec];
        saveUserWidgets(boardId, next);
        return next;
      });
    },
    [boardId],
  );

  const removeWidget = useCallback(
    (id: string) => {
      setUserSpecs(prev => {
        const next = prev.filter(w => w.id !== id);
        saveUserWidgets(boardId, next);
        return next;
      });
      setLayout(prev => {
        const { [id]: _, ...rest } = prev;
        saveLayout(boardId, rest);
        return rest;
      });
    },
    [boardId],
  );

  const handleLayoutChange = useCallback(
    (next: Layout) => {
      setLayout(next);
      saveLayout(boardId, next);
    },
    [boardId],
  );

  const allSpecs = useMemo(
    () => [...systemSpecs, ...userSpecs],
    [systemSpecs, userSpecs],
  );

  const canvasItems: CanvasItem[] = useMemo(
    () =>
      allSpecs.map(spec => ({
        id: spec.id,
        size: spec.size,
        canMove: editingBoard && spec.origin === 'user',
        render: () => (
          <WidgetRenderer
            spec={spec}
            data={spec.origin === 'user' ? userData[spec.id] : data[spec.id]}
            editMode={editingBoard && spec.origin === 'user'}
            onRemove={
              spec.origin === 'user' ? () => removeWidget(spec.id) : undefined
            }
          />
        ),
      })),
    [allSpecs, data, userData, editingBoard, removeWidget],
  );

  return (
    <>
      <CanvasGrid
        items={canvasItems}
        cols={cols}
        layout={layout}
        onLayoutChange={handleLayoutChange}
      />

      <div style={{ display: 'flex', gap: CELL.gap, marginTop: CELL.gap }}>
        {allowAdd && <AddTile onClick={() => setDesignerOpen(true)} />}

        {userSpecs.length > 0 && (
          <button
            onClick={() => setEditingBoard(v => !v)}
            style={{
              fontSize: 11,
              padding: '6px 14px',
              borderRadius: 999,
              background: editingBoard ? 'rgba(200,242,107,0.12)' : 'var(--glass)',
              border: `1px solid ${editingBoard ? 'rgba(200,242,107,0.4)' : 'var(--glass-border)'}`,
              color: editingBoard ? 'var(--brand)' : 'var(--text-3)',
              cursor: 'pointer',
              fontWeight: 300,
              alignSelf: 'center',
            }}
          >
            {editingBoard ? 'Done editing' : 'Edit widgets'}
          </button>
        )}
      </div>

      <WidgetDesigner
        open={designerOpen}
        onClose={() => setDesignerOpen(false)}
        onSave={addWidget}
      />
    </>
  );
}

function AddTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Add widget"
      style={{
        width: 2 * CELL.width + CELL.gap,
        height: CELL.height,
        borderRadius: 20,
        border: '1px dashed var(--glass-border)',
        background: 'transparent',
        color: 'var(--text-3)',
        fontSize: 12,
        fontWeight: 300,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'all 260ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(200,242,107,0.4)';
        e.currentTarget.style.color = 'var(--brand)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--glass-border)';
        e.currentTarget.style.color = 'var(--text-3)';
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
      Add widget
    </button>
  );
}
