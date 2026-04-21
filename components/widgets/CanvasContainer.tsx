'use client';
/**
 * CanvasContainer — binds the switcher to the active board.
 *
 * Drop this component into any page that wants the canvas
 * experience for a given environment. It handles:
 *   • Loading canvases for the environment
 *   • Creating a first canvas if none exist (named "Today")
 *   • Switching the active canvas
 *   • Rename / delete via the switcher's menu
 *
 * The active canvas's widgets + layout are DB-backed via
 * useCanvasSync, with localStorage fallback on network failure.
 */
import { useCallback, useEffect, useState } from 'react';
import CanvasSwitcher, { type CanvasTab } from './CanvasSwitcher';
import WidgetBoard from './WidgetBoard';
import NameSheet from './NameSheet';
import type { WidgetSpec } from '@/lib/widgets/registry';
import type { BoardData } from './WidgetBoard';
import { useSwipe } from '@/lib/widgets/swipe';
import { DURATION, EASE } from '@/lib/widgets/motion';

type Props = {
  environmentId: string;
  /** Default canvas name when creating the first one. */
  defaultCanvasName?: string;
  /** Widgets that ship with every canvas by default (system-origin). */
  systemSpecs?: WidgetSpec[];
  /** Data for system-origin widgets, keyed by widget id. */
  systemData?: BoardData;
};

export default function CanvasContainer({
  environmentId,
  defaultCanvasName = 'Today',
  systemSpecs = [],
  systemData = {},
}: Props) {
  const [canvases, setCanvases] = useState<CanvasTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/canvases?environmentId=${environmentId}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      setLoaded(true);
      return;
    }
    const list = (await res.json()) as Array<{ id: string; name: string; icon?: string | null }>;
    setCanvases(list.map(c => ({ id: c.id, name: c.name, icon: c.icon })));

    // Auto-create the first canvas if none exist.
    if (list.length === 0) {
      const created = await fetch('/api/canvases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environmentId,
          name: defaultCanvasName,
          widgets: [],
          layout: {},
        }),
      });
      if (created.ok) {
        const c = await created.json();
        setCanvases([{ id: c.id, name: c.name, icon: c.icon }]);
        setActiveId(c.id);
      }
    } else {
      // Restore last-active canvas if we remembered it.
      const remembered =
        typeof window !== 'undefined'
          ? localStorage.getItem(`grid_active_canvas_${environmentId}`)
          : null;
      const target = list.find(c => c.id === remembered) ?? list[0];
      setActiveId(target.id);
    }
    setLoaded(true);
  }, [environmentId, defaultCanvasName]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = useCallback(
    (id: string) => {
      setActiveId(id);
      try {
        localStorage.setItem(`grid_active_canvas_${environmentId}`, id);
      } catch {
        /* non-fatal */
      }
    },
    [environmentId],
  );

  const [nameSheetOpen, setNameSheetOpen] = useState(false);

  const handleCreate = useCallback(() => {
    setNameSheetOpen(true);
  }, []);

  const confirmCreate = useCallback(
    async (name: string) => {
      const res = await fetch('/api/canvases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environmentId,
          name,
          widgets: [],
          layout: {},
        }),
      });
      if (res.ok) {
        const c = await res.json();
        setCanvases(prev => [...prev, { id: c.id, name: c.name, icon: c.icon }]);
        handleSelect(c.id);
      }
      setNameSheetOpen(false);
    },
    [environmentId, handleSelect],
  );

  const handleRename = useCallback(
    async (id: string, name: string) => {
      setCanvases(prev => prev.map(c => (c.id === id ? { ...c, name } : c)));
      await fetch(`/api/canvases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    },
    [],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const remaining = canvases.filter(c => c.id !== id);
      setCanvases(remaining);
      if (activeId === id && remaining.length > 0) {
        handleSelect(remaining[0].id);
      }
      await fetch(`/api/canvases/${id}`, { method: 'DELETE' });
    },
    [canvases, activeId, handleSelect],
  );

  const handleReorder = useCallback(
    async (orderedIds: string[]) => {
      // Reorder locally first for instant feedback, then persist
      // each canvas's new position. Keep the requests in flight
      // parallel — they don't depend on each other.
      const byId = new Map(canvases.map(c => [c.id, c]));
      const next = orderedIds
        .map(id => byId.get(id))
        .filter((c): c is CanvasTab => Boolean(c));
      setCanvases(next);
      await Promise.all(
        orderedIds.map((id, position) =>
          fetch(`/api/canvases/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position }),
          }),
        ),
      );
    },
    [canvases],
  );

  // Swipe navigation — horizontal pan on the board moves between
  // canvases iOS-home-screen style. Follow-animation renders the
  // active board translating with the finger; on commit we switch
  // canvas and let the new one settle in.
  const [dragDx, setDragDx] = useState(0);
  const [committing, setCommitting] = useState<'left' | 'right' | null>(null);

  const activeIndex = activeId
    ? canvases.findIndex(c => c.id === activeId)
    : -1;

  const swipeHandlers = useSwipe({
    onMove: dx => {
      // Only translate visually if there is somewhere to go in that
      // direction — rubber-band at the ends.
      const rubberBanded =
        (dx < 0 && activeIndex >= canvases.length - 1) ||
        (dx > 0 && activeIndex <= 0)
          ? dx / 3
          : dx;
      setDragDx(rubberBanded);
    },
    onLeft: () => {
      // Swipe right → previous canvas.
      if (activeIndex > 0) {
        setCommitting('left');
        setTimeout(() => {
          handleSelect(canvases[activeIndex - 1].id);
          setDragDx(0);
          setCommitting(null);
        }, 180);
      } else {
        setDragDx(0);
      }
    },
    onRight: () => {
      // Swipe left → next canvas.
      if (activeIndex < canvases.length - 1) {
        setCommitting('right');
        setTimeout(() => {
          handleSelect(canvases[activeIndex + 1].id);
          setDragDx(0);
          setCommitting(null);
        }, 180);
      } else {
        setDragDx(0);
      }
    },
    onEnd: () => {
      // Spring-back when swipe didn't commit.
      if (!committing) setDragDx(0);
    },
  });

  if (!loaded) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: 40,
        }}
      >
        <div
          className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--glass-border)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <CanvasSwitcher
          canvases={canvases}
          activeId={activeId}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onRename={handleRename}
          onDelete={handleDelete}
          onReorder={handleReorder}
        />
      </div>

      {activeId && (
        <div
          {...swipeHandlers}
          style={{
            transform: committing
              ? `translateX(${committing === 'left' ? 40 : -40}px)`
              : `translateX(${dragDx}px)`,
            opacity: committing ? 0 : 1 - Math.min(Math.abs(dragDx) / 400, 0.2),
            transition:
              dragDx === 0 || committing
                ? `transform ${DURATION.settle}ms ${EASE.settle}, opacity ${DURATION.settle}ms ${EASE.settle}`
                : 'none',
            willChange: 'transform, opacity',
            touchAction: 'pan-y',
          }}
        >
          <WidgetBoard
            key={activeId}
            boardId={`canvas-${activeId}`}
            canvasId={activeId}
            systemSpecs={systemSpecs}
            data={systemData}
          />
        </div>
      )}

      <NameSheet
        open={nameSheetOpen}
        title="New canvas"
        placeholder="e.g. Financials, Creative, Launch week"
        confirmLabel="Create canvas"
        onClose={() => setNameSheetOpen(false)}
        onConfirm={confirmCreate}
      />
    </div>
  );
}
