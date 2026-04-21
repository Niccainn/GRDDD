/**
 * Canvas sync hook — load/save a user's widget specs + layout.
 *
 * Dual-mode:
 *   • DB-backed when `canvasId` is provided (server round-trip,
 *     cross-device sync, survives clears of local storage).
 *   • localStorage fallback when no canvasId (legacy dashboard,
 *     unauthenticated flows, offline).
 *
 * Writes are debounced so dragging a widget doesn't flood the DB
 * with PATCHes — one trailing save per 400ms of idle.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { WidgetSpec } from './registry';
import type { Layout } from './canvas';

type SyncState = {
  specs: WidgetSpec[];
  layout: Layout;
  loaded: boolean;
};

const DEBOUNCE_MS = 400;

export function useCanvasSync(args: {
  canvasId?: string;
  boardId: string;
}): {
  specs: WidgetSpec[];
  layout: Layout;
  loaded: boolean;
  setSpecs: (next: WidgetSpec[]) => void;
  setLayout: (next: Layout) => void;
} {
  const { canvasId, boardId } = args;
  const [state, setState] = useState<SyncState>({
    specs: [],
    layout: {},
    loaded: false,
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef<string>('');

  // Load.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (canvasId) {
        try {
          const res = await fetch(`/api/canvases/${canvasId}`, { cache: 'no-store' });
          if (res.ok) {
            const c = await res.json();
            if (!cancelled) {
              setState({
                specs: tryParse<WidgetSpec[]>(c.widgets, []),
                layout: tryParse<Layout>(c.layout, {}),
                loaded: true,
              });
              return;
            }
          }
        } catch {
          /* fall through to localStorage */
        }
      }
      // localStorage fallback.
      if (cancelled) return;
      setState({
        specs: tryLoad<WidgetSpec[]>(`grid_widgets_${boardId}`, []),
        layout: tryLoad<Layout>(`grid_layout_${boardId}`, {}),
        loaded: true,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [canvasId, boardId]);

  // Persist — debounced.
  const persist = useCallback(
    (specs: WidgetSpec[], layout: Layout) => {
      const payload = JSON.stringify({ widgets: specs, layout });
      if (payload === lastSent.current) return;
      lastSent.current = payload;

      if (canvasId) {
        fetch(`/api/canvases/${canvasId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        }).catch(() => {
          // Network failure — fall back to localStorage so we don't
          // lose the edit. Next successful load will pull from DB.
          trySave(`grid_widgets_${boardId}`, specs);
          trySave(`grid_layout_${boardId}`, layout);
        });
      } else {
        trySave(`grid_widgets_${boardId}`, specs);
        trySave(`grid_layout_${boardId}`, layout);
      }
    },
    [canvasId, boardId],
  );

  const setSpecs = useCallback(
    (next: WidgetSpec[]) => {
      setState(prev => {
        const updated = { ...prev, specs: next };
        scheduleSave(saveTimer, () => persist(updated.specs, updated.layout));
        return updated;
      });
    },
    [persist],
  );

  const setLayout = useCallback(
    (next: Layout) => {
      setState(prev => {
        const updated = { ...prev, layout: next };
        scheduleSave(saveTimer, () => persist(updated.specs, updated.layout));
        return updated;
      });
    },
    [persist],
  );

  return { ...state, setSpecs, setLayout };
}

function scheduleSave(
  timer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  fn: () => void,
) {
  if (timer.current) clearTimeout(timer.current);
  timer.current = setTimeout(fn, DEBOUNCE_MS);
}

function tryParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function tryLoad<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function trySave(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* non-fatal */
  }
}
