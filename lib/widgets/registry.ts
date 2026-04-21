/**
 * Widget registry — the universal output primitive.
 *
 * A widget is a *rendering adapter* over existing Grid entities.
 * It does NOT introduce new data — it frames what the user already has
 * (Systems, Workflows, Integrations, Nova outputs, Signals) so each
 * one can be composed onto a canvas like an iPhone home-screen tile.
 *
 * Schema is deliberately small. Every widget is:
 *   { id, kind, size, title, source, params, refresh, createdBy }
 *
 * Apple discipline: sizes are a fixed grid (1×1 through 4×4), nothing
 * in between. The canvas engine (Phase 6) enforces snap; widgets
 * themselves just declare their natural size.
 */

export type WidgetSize = '1x1' | '2x1' | '2x2' | '4x2' | '4x4';

export type WidgetKind =
  | 'stat'          // single big number + optional spark (1x1, 2x1)
  | 'feed'          // rolling list of items — TODAY feed style (2x2, 4x2, 4x4)
  | 'system'        // a System at a glance (2x1, 2x2)
  | 'integration'   // integration status + last sync (1x1, 2x1)
  | 'nova-output'   // any Nova response pinned as a widget (2x2, 4x2)
  | 'chart'         // stub for Phase 6+ (2x2, 4x2)
  | 'custom';       // user-composed widget via WidgetDesigner

export type WidgetSource =
  | { type: 'system'; id: string }
  | { type: 'workflow'; id: string }
  | { type: 'integration'; providerId: string; accountLabel?: string }
  | { type: 'query'; path: string }            // arbitrary /api path → JSON
  | { type: 'nova'; conversationId: string; messageId: string }
  | { type: 'static'; payload: unknown };

export type WidgetRefresh =
  | { mode: 'manual' }
  | { mode: 'interval'; seconds: number }
  | { mode: 'live' };                          // SSE or poll; Phase 6+

export type WidgetSpec = {
  id: string;
  kind: WidgetKind;
  size: WidgetSize;
  title: string;
  subtitle?: string;
  source: WidgetSource;
  params?: Record<string, unknown>;
  refresh: WidgetRefresh;
  /** 'system' = shipped with Grid; 'user' = composed in the designer. */
  origin: 'system' | 'user';
  createdBy?: string;
  createdAt?: string;
};

/**
 * Natural sizes per kind. Users can upsize (2x1 → 4x2) but the
 * default is what Apple-literature calls the "principal size."
 * Keeping this list short lets the designer show exactly the
 * sizes that make sense for a given data shape.
 */
export const WIDGET_SIZES: Record<WidgetKind, WidgetSize[]> = {
  stat: ['1x1', '2x1'],
  feed: ['2x2', '4x2', '4x4'],
  system: ['2x1', '2x2'],
  integration: ['1x1', '2x1'],
  'nova-output': ['2x2', '4x2'],
  chart: ['2x2', '4x2'],
  custom: ['1x1', '2x1', '2x2', '4x2', '4x4'],
};

/** Grid cell dimensions in px. Tweak as a single source of truth. */
export const CELL = { width: 88, height: 88, gap: 12 };

export function sizeToCells(size: WidgetSize): { w: number; h: number } {
  const [w, h] = size.split('x').map(Number);
  return { w, h };
}

export function sizeToPx(size: WidgetSize) {
  const { w, h } = sizeToCells(size);
  return {
    width: w * CELL.width + (w - 1) * CELL.gap,
    height: h * CELL.height + (h - 1) * CELL.gap,
  };
}
