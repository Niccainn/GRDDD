'use client';
/**
 * IntegrationWidget — status + last sync for a connected integration.
 * 1×1 compact glyph+dot, or 2×1 with provider name + relative sync.
 */
import WidgetFrame from './WidgetFrame';
import type { WidgetSpec } from '@/lib/widgets/registry';

type IntegrationWidgetProps = {
  spec: WidgetSpec;
  integration: {
    providerId: string;
    displayName: string;
    glyph?: string;
    accentColor?: string;
    status: 'ACTIVE' | 'ERROR' | 'PENDING' | 'DISCONNECTED';
    lastSyncedAt?: string | null;
  };
  editMode?: boolean;
  onRemove?: () => void;
  menuItems?: Array<{ id: string; label: string; destructive?: boolean; disabled?: boolean; onSelect: () => void }>;
  onOpen?: () => void;
};

const STATUS_COLOR: Record<IntegrationWidgetProps['integration']['status'], string> = {
  ACTIVE: '#15AD70',
  ERROR: '#FF6B6B',
  PENDING: '#F7C700',
  DISCONNECTED: 'rgba(255,255,255,0.25)',
};

const STATUS_LABEL: Record<IntegrationWidgetProps['integration']['status'], string> = {
  ACTIVE: 'Live',
  ERROR: 'Attention',
  PENDING: 'Syncing',
  DISCONNECTED: 'Offline',
};

function relTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function IntegrationWidget({
  spec,
  integration,
  editMode,
  onRemove,
  menuItems,
  onOpen,
}: IntegrationWidgetProps) {
  const accent = integration.accentColor ?? '#7193ED';
  const isCompact = spec.size === '1x1';

  return (
    <WidgetFrame
      size={spec.size}
      editMode={editMode}
      onRemove={onRemove}
      menuItems={menuItems}
      onOpen={onOpen ?? (() => (window.location.href = '/integrations'))}
      accent={accent}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          height: '100%',
        }}
      >
        <div
          style={{
            width: isCompact ? 36 : 40,
            height: isCompact ? 36 : 40,
            borderRadius: 10,
            background: `${accent}14`,
            border: `1px solid ${accent}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            fontSize: 16,
            fontWeight: 500,
            flexShrink: 0,
          }}
          aria-hidden
        >
          {integration.glyph ?? integration.displayName.slice(0, 1)}
        </div>

        {!isCompact && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-1)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {integration.displayName}
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 4,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 5,
                  background: STATUS_COLOR[integration.status],
                  boxShadow: `0 0 8px ${STATUS_COLOR[integration.status]}60`,
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                {STATUS_LABEL[integration.status]} · {relTime(integration.lastSyncedAt)}
              </span>
            </div>
          </div>
        )}

        {isCompact && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 6,
              background: STATUS_COLOR[integration.status],
              boxShadow: `0 0 10px ${STATUS_COLOR[integration.status]}60`,
              marginLeft: 'auto',
            }}
          />
        )}
      </div>
    </WidgetFrame>
  );
}
