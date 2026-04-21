'use client';
/**
 * WidgetRenderer — the spec-driven entry point for Phase-6 widgets.
 *
 * Not to be confused with `Widget.tsx` — that's the legacy card
 * layout used by the existing dashboard widgets (ActivityFeedWidget,
 * GoalsWidget, etc.). Both coexist intentionally during the
 * transition: old widgets keep working, new spec-based widgets
 * (StatWidget/FeedWidget/etc.) are rendered through this dispatcher.
 */
import type { WidgetSpec } from '@/lib/widgets/registry';
import StatWidget from './StatWidget';
import FeedWidget, { type FeedWidgetItem } from './FeedWidget';
import SystemWidget from './SystemWidget';
import IntegrationWidget from './IntegrationWidget';
import NovaOutputWidget from './NovaOutputWidget';

export type WidgetRenderData = {
  stat?: {
    value: string | number;
    delta?: { value: number; label?: string } | null;
    spark?: number[] | null;
  };
  feed?: { items: FeedWidgetItem[]; emptyLabel?: string };
  system?: {
    id: string;
    name: string;
    color: string | null;
    healthScore: number | null;
    lastActionText?: string | null;
  };
  integration?: {
    providerId: string;
    displayName: string;
    glyph?: string;
    accentColor?: string;
    status: 'ACTIVE' | 'ERROR' | 'PENDING' | 'DISCONNECTED';
    lastSyncedAt?: string | null;
  };
  novaOutput?: {
    headline: string;
    body?: string;
    reasoning?: string;
    confidence?: number;
    lastUpdatedAt?: string | null;
  };
};

type Props = {
  spec: WidgetSpec;
  data?: WidgetRenderData;
  editMode?: boolean;
  onRemove?: () => void;
  onOpen?: () => void;
};

export default function WidgetRenderer({
  spec,
  data,
  editMode,
  onRemove,
  onOpen,
}: Props) {
  switch (spec.kind) {
    case 'stat':
      return (
        <StatWidget
          spec={spec}
          value={data?.stat?.value ?? '—'}
          delta={data?.stat?.delta ?? null}
          spark={data?.stat?.spark ?? null}
          editMode={editMode}
          onRemove={onRemove}
          onOpen={onOpen}
        />
      );
    case 'feed':
      return (
        <FeedWidget
          spec={spec}
          items={data?.feed?.items ?? []}
          emptyLabel={data?.feed?.emptyLabel}
          editMode={editMode}
          onRemove={onRemove}
          onOpen={onOpen}
        />
      );
    case 'system':
      return data?.system ? (
        <SystemWidget
          spec={spec}
          system={data.system}
          editMode={editMode}
          onRemove={onRemove}
          onOpen={onOpen}
        />
      ) : null;
    case 'integration':
      return data?.integration ? (
        <IntegrationWidget
          spec={spec}
          integration={data.integration}
          editMode={editMode}
          onRemove={onRemove}
          onOpen={onOpen}
        />
      ) : null;
    case 'nova-output':
      return data?.novaOutput ? (
        <NovaOutputWidget
          spec={spec}
          output={data.novaOutput}
          editMode={editMode}
          onRemove={onRemove}
          onOpen={onOpen}
        />
      ) : null;
    case 'chart':
    case 'custom':
    default:
      return (
        <StatWidget
          spec={{ ...spec, kind: 'stat' }}
          value="—"
          editMode={editMode}
          onRemove={onRemove}
          onOpen={onOpen}
        />
      );
  }
}
