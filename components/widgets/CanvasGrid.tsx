'use client';
/**
 * CanvasGrid — the snap-layout engine that replaces flex-wrap.
 *
 * Per-widget absolute positioning with drag + resize via pointer
 * events (so touch and mouse share one code path). On release,
 * snap to the nearest cell and resolve overlaps by pushing
 * conflicting widgets straight down — iOS home-screen behavior.
 *
 * Pre-canvas-engine widgets still render through the existing
 * WidgetRenderer; only the container layout changes here.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
  type ReactNode,
} from 'react';
import {
  DEFAULT_COLS,
  cellToPx,
  findFreeSlot,
  layoutHeight,
  pxToCell,
  resolveCollision,
  sizeRect,
  type CellRect,
  type Layout,
} from '@/lib/widgets/canvas';
import { CELL, type WidgetSize } from '@/lib/widgets/registry';
import { DURATION, EASE } from '@/lib/widgets/motion';

export type CanvasItem = {
  id: string;
  size: WidgetSize;
  /** If the widget is in edit mode (draggable/resizable). */
  canMove: boolean;
  render: (opts: { dragging: boolean }) => ReactNode;
};

type Props = {
  items: CanvasItem[];
  cols?: number;
  layout: Layout;
  onLayoutChange: (next: Layout) => void;
};

export default function CanvasGrid({
  items,
  cols = DEFAULT_COLS,
  layout,
  onLayoutChange,
}: Props) {
  // Ensure every item has a rect. New items get the first free slot.
  const resolvedLayout: Layout = useMemo(() => {
    const next: Layout = { ...layout };
    for (const item of items) {
      if (!next[item.id]) {
        const s = sizeRect(item.size);
        const slot = findFreeSlot(next, cols, s.w, s.h);
        next[item.id] = { ...slot, ...s };
      }
    }
    return next;
  }, [items, layout, cols]);

  // Propagate the auto-placed rects back to the parent once, so the
  // persisted layout stays in sync without an infinite render loop.
  useEffect(() => {
    const keys = Object.keys(resolvedLayout);
    const parentKeys = Object.keys(layout);
    if (keys.length !== parentKeys.length) {
      onLayoutChange(resolvedLayout);
    }
  }, [resolvedLayout, layout, onLayoutChange]);

  const [dragId, setDragId] = useState<string | null>(null);
  const [ghostRect, setGhostRect] = useState<CellRect | null>(null);
  const dragState = useRef<{
    id: string;
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    startRect: CellRect;
  } | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const s = dragState.current;
    if (!s || !gridRef.current) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    const step = CELL.width + CELL.gap;

    if (s.mode === 'move') {
      const currentPx = cellToPx(s.startRect);
      const next = pxToCell(currentPx.left + dx, currentPx.top + dy);
      const rect: CellRect = {
        x: Math.min(Math.max(0, next.x), cols - s.startRect.w),
        y: Math.max(0, next.y),
        w: s.startRect.w,
        h: s.startRect.h,
      };
      setGhostRect(rect);
    } else {
      // Resize — delta → cells, clamp to min 1×1.
      const addW = Math.round(dx / step);
      const addH = Math.round(dy / step);
      const rect: CellRect = {
        x: s.startRect.x,
        y: s.startRect.y,
        w: Math.max(1, Math.min(cols - s.startRect.x, s.startRect.w + addW)),
        h: Math.max(1, s.startRect.h + addH),
      };
      setGhostRect(rect);
    }
  }, [cols]);

  const onPointerUp = useCallback(() => {
    const s = dragState.current;
    if (!s) return;
    if (ghostRect) {
      const next = resolveCollision(resolvedLayout, s.id, ghostRect);
      onLayoutChange(next);
    }
    dragState.current = null;
    setDragId(null);
    setGhostRect(null);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  }, [ghostRect, resolvedLayout, onLayoutChange, onPointerMove]);

  const startDrag = useCallback(
    (id: string, mode: 'move' | 'resize', e: RPointerEvent<HTMLElement>) => {
      const rect = resolvedLayout[id];
      if (!rect) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      dragState.current = {
        id,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        startRect: rect,
      };
      setDragId(id);
      setGhostRect(rect);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [resolvedLayout, onPointerMove, onPointerUp],
  );

  // Total grid height — grows to fit.
  const gridPxHeight = layoutHeight(resolvedLayout) + 4;
  const gridPxWidth = cols * CELL.width + (cols - 1) * CELL.gap;

  return (
    <div
      ref={gridRef}
      style={{
        position: 'relative',
        width: gridPxWidth,
        maxWidth: '100%',
        minHeight: gridPxHeight,
        touchAction: dragId ? 'none' : 'pan-y',
      }}
    >
      {/* Ghost preview — shows where the widget will land on release */}
      {dragId && ghostRect && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            ...cellToPx(ghostRect),
            background: 'rgba(200,242,107,0.08)',
            border: '1px dashed rgba(200,242,107,0.4)',
            borderRadius: 20,
            pointerEvents: 'none',
            transition: `all ${DURATION.hover}ms ${EASE.settle}`,
            zIndex: 0,
          }}
        />
      )}

      {items.map(item => {
        const rect =
          dragId === item.id && ghostRect ? ghostRect : resolvedLayout[item.id];
        if (!rect) return null;
        const px = cellToPx(rect);
        const isDragging = dragId === item.id;

        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              ...px,
              zIndex: isDragging ? 10 : 1,
              transition: isDragging
                ? 'none'
                : `left ${DURATION.settle}ms ${EASE.settle}, top ${DURATION.settle}ms ${EASE.settle}, width ${DURATION.settle}ms ${EASE.settle}, height ${DURATION.settle}ms ${EASE.settle}`,
              opacity: isDragging ? 0.94 : 1,
              transform: isDragging ? 'scale(1.03)' : 'scale(1)',
              transformOrigin: 'center',
            }}
          >
            {/* Drag surface — only active when the widget is editable.
                Wraps the whole widget with pointerdown capture; the
                inner widget's own click handlers still work when not
                in edit mode because canMove is false. */}
            <div
              onPointerDown={
                item.canMove ? e => startDrag(item.id, 'move', e) : undefined
              }
              style={{
                width: '100%',
                height: '100%',
                cursor: item.canMove ? 'grab' : 'default',
                touchAction: item.canMove ? 'none' : 'auto',
              }}
            >
              {item.render({ dragging: isDragging })}
            </div>

            {/* Resize handle — bottom-right corner. Only in edit mode. */}
            {item.canMove && (
              <button
                onPointerDown={e => startDrag(item.id, 'resize', e)}
                aria-label="Resize widget"
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 28,
                  height: 28,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'se-resize',
                  touchAction: 'none',
                  padding: 0,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    right: 6,
                    bottom: 6,
                    width: 10,
                    height: 10,
                    borderRight: '2px solid rgba(255,255,255,0.35)',
                    borderBottom: '2px solid rgba(255,255,255,0.35)',
                    borderBottomRightRadius: 2,
                  }}
                />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
