/**
 * Canvas layout types + helpers.
 *
 * The canvas is a column-bounded snap grid. Widgets live at
 * integer cell coordinates; the renderer multiplies by CELL.width
 * + gap to project them to pixels. This keeps drag math simple
 * and ensures every widget is always aligned to the grid.
 */
import { CELL, sizeToCells, type WidgetSize } from './registry';

export type CellRect = { x: number; y: number; w: number; h: number };

/** Default column count. The canvas grows vertically, not horizontally. */
export const DEFAULT_COLS = 4;

/** Layout map keyed by widget id. */
export type Layout = Record<string, CellRect>;

export function rectsOverlap(a: CellRect, b: CellRect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/** Find the first empty cell top-to-bottom, left-to-right that fits w×h. */
export function findFreeSlot(
  layout: Layout,
  cols: number,
  w: number,
  h: number,
  skipId?: string,
): { x: number; y: number } {
  const rects = Object.entries(layout)
    .filter(([id]) => id !== skipId)
    .map(([, r]) => r);
  const maxY = rects.reduce((m, r) => Math.max(m, r.y + r.h), 0) + h;
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x + w <= cols; x++) {
      const candidate: CellRect = { x, y, w, h };
      if (!rects.some(r => rectsOverlap(candidate, r))) return { x, y };
    }
  }
  return { x: 0, y: maxY };
}

/**
 * Place a rect at a target position, pushing overlapping rects
 * straight down by just enough cells to clear the collision.
 * Intentionally gentle — widgets don't reshuffle horizontally,
 * they just slide down. Matches iOS home-screen behavior.
 */
export function resolveCollision(
  layout: Layout,
  movedId: string,
  target: CellRect,
): Layout {
  const next: Layout = { ...layout, [movedId]: target };
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 200) {
    changed = false;
    iterations++;
    for (const [id, rect] of Object.entries(next)) {
      if (id === movedId) continue;
      if (rectsOverlap(rect, next[movedId])) {
        // Push the conflict down just past movedId's bottom.
        const pushedY = next[movedId].y + next[movedId].h;
        if (rect.y !== pushedY) {
          next[id] = { ...rect, y: pushedY };
          changed = true;
        }
      }
    }
    // After the first pass moved some rects, re-check for new
    // overlaps *between* the displaced rects themselves.
    const ids = Object.keys(next);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i];
        const b = ids[j];
        if (a === movedId || b === movedId) continue;
        if (rectsOverlap(next[a], next[b])) {
          // Push b down past a.
          const pushedY = next[a].y + next[a].h;
          if (next[b].y < pushedY) {
            next[b] = { ...next[b], y: pushedY };
            changed = true;
          }
        }
      }
    }
  }
  return next;
}

export function cellToPx(cell: CellRect) {
  return {
    left: cell.x * (CELL.width + CELL.gap),
    top: cell.y * (CELL.height + CELL.gap),
    width: cell.w * CELL.width + (cell.w - 1) * CELL.gap,
    height: cell.h * CELL.height + (cell.h - 1) * CELL.gap,
  };
}

/** Clamp the dragged pointer delta to a cell-snapped rect. */
export function pxToCell(
  left: number,
  top: number,
): { x: number; y: number } {
  const step = CELL.width + CELL.gap;
  return {
    x: Math.max(0, Math.round(left / step)),
    y: Math.max(0, Math.round(top / step)),
  };
}

export function sizeRect(size: WidgetSize): { w: number; h: number } {
  return sizeToCells(size);
}

export function layoutHeight(layout: Layout): number {
  let maxY = 0;
  for (const r of Object.values(layout)) {
    maxY = Math.max(maxY, r.y + r.h);
  }
  return maxY * (CELL.height + CELL.gap) - CELL.gap;
}
