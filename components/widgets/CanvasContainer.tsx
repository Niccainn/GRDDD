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
import type { WidgetSpec } from '@/lib/widgets/registry';
import type { BoardData } from './WidgetBoard';

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

  const handleCreate = useCallback(async () => {
    const name = prompt('Name this canvas');
    if (!name || !name.trim()) return;
    const res = await fetch('/api/canvases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environmentId,
        name: name.trim(),
        widgets: [],
        layout: {},
      }),
    });
    if (res.ok) {
      const c = await res.json();
      setCanvases(prev => [...prev, { id: c.id, name: c.name, icon: c.icon }]);
      handleSelect(c.id);
    }
  }, [environmentId, handleSelect]);

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
        />
      </div>

      {activeId && (
        <WidgetBoard
          key={activeId}
          boardId={`canvas-${activeId}`}
          canvasId={activeId}
          systemSpecs={systemSpecs}
          data={systemData}
        />
      )}
    </div>
  );
}
