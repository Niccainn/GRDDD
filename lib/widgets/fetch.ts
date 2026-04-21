/**
 * Widget data fetchers — one per source type.
 *
 * Each fetcher takes a WidgetSource and returns a WidgetRenderData
 * slice. The board calls these lazily per-widget on mount + on a
 * refresh cadence per the spec's `refresh` field.
 *
 * Discipline: fail silently with a sensible "—" so a broken fetch
 * degrades into a calm empty widget, never a red error box on a
 * user's canvas.
 */
import type { WidgetSource } from './registry';
import type { WidgetRenderData } from '@/components/widgets/WidgetRenderer';

async function safeJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchSystem(id: string): Promise<WidgetRenderData['system'] | undefined> {
  const sys = await safeJson<{
    id: string;
    name: string;
    color: string | null;
    healthScore: number | null;
    lastActivity?: string | null;
    description?: string | null;
  }>(`/api/systems/${id}`);
  if (!sys) return undefined;
  return {
    id: sys.id,
    name: sys.name,
    color: sys.color,
    healthScore: sys.healthScore,
    lastActionText: sys.lastActivity ?? sys.description ?? null,
  };
}

async function fetchIntegration(
  providerId: string,
): Promise<WidgetRenderData['integration'] | undefined> {
  const all = await safeJson<
    Array<{
      id: string;
      provider: string;
      displayName: string;
      status: 'ACTIVE' | 'ERROR' | 'PENDING' | 'DISCONNECTED';
      lastSyncedAt?: string | null;
    }>
  >('/api/integrations?connected=1');
  if (!all) return undefined;
  const match = all.find(i => i.provider === providerId);
  if (!match) {
    // Not connected yet — render with a DISCONNECTED chip.
    return {
      providerId,
      displayName: providerId,
      status: 'DISCONNECTED',
      lastSyncedAt: null,
    };
  }
  return {
    providerId,
    displayName: match.displayName,
    status: match.status,
    lastSyncedAt: match.lastSyncedAt ?? null,
  };
}

async function fetchQuery(path: string): Promise<WidgetRenderData> {
  // A /api/* query can power any kind. We inspect the shape and
  // project it onto the widget's render slots. Gentle heuristics,
  // not a schema contract — users wiring custom queries know their
  // endpoint.
  const data = await safeJson<unknown>(path);
  if (!data) return {};

  // Array of objects with title/subtitle → feed.
  if (Array.isArray(data) && data.every(d => typeof d === 'object')) {
    const items = data.slice(0, 12).map((raw, i) => {
      const o = raw as Record<string, unknown>;
      return {
        id: String(o.id ?? i),
        title: String(o.title ?? o.name ?? o.label ?? 'Item'),
        subtitle: typeof o.subtitle === 'string' ? o.subtitle : undefined,
        href: typeof o.href === 'string' ? o.href : undefined,
      };
    });
    return { feed: { items } };
  }

  // Object with a single numeric → stat.
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const key of ['value', 'count', 'total', 'n']) {
      if (typeof o[key] === 'number' || typeof o[key] === 'string') {
        return { stat: { value: o[key] as string | number } };
      }
    }
  }

  return {};
}

export async function fetchWidgetData(
  source: WidgetSource,
): Promise<WidgetRenderData> {
  switch (source.type) {
    case 'system': {
      const system = await fetchSystem(source.id);
      return system ? { system } : {};
    }
    case 'integration': {
      const integration = await fetchIntegration(source.providerId);
      return integration ? { integration } : {};
    }
    case 'query':
      return fetchQuery(source.path);
    case 'nova': {
      // Stub — the Nova endpoint for pinned messages lands with Phase 4.
      // Return a calm placeholder so the widget renders something.
      return {
        novaOutput: {
          headline: 'Nova output pinned — live sync arrives with the Nova bar.',
          confidence: undefined,
        },
      };
    }
    case 'static':
      return {
        stat: {
          value: typeof source.payload === 'string' ? source.payload : '—',
        },
      };
    default:
      return {};
  }
}
