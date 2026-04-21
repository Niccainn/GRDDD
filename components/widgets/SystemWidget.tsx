'use client';
/**
 * SystemWidget — a System at-a-glance. Shows name, accent, health,
 * last Nova action. 2×1 (compact) or 2×2 (with last-action line).
 *
 * This is the rendering adapter that lets a System live on any
 * canvas — dashboard, environment page, a user's custom canvas.
 * All data comes from the existing System API; no schema changes.
 */
import WidgetFrame from './WidgetFrame';
import type { WidgetSpec } from '@/lib/widgets/registry';

type SystemWidgetProps = {
  spec: WidgetSpec;
  system: {
    id: string;
    name: string;
    color: string | null;
    healthScore: number | null;
    lastActionText?: string | null;
  };
  editMode?: boolean;
  onRemove?: () => void;
  onOpen?: () => void;
};

export default function SystemWidget({
  spec,
  system,
  editMode,
  onRemove,
  onOpen,
}: SystemWidgetProps) {
  const accent = system.color ?? '#7193ED';
  const health = system.healthScore;
  const healthText = health === null ? '—' : `${Math.round(health)}%`;
  const isTall = spec.size === '2x2';

  return (
    <WidgetFrame
      size={spec.size}
      editMode={editMode}
      onRemove={onRemove}
      onOpen={onOpen ?? (() => (window.location.href = `/systems/${system.id}`))}
      accent={accent}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 8,
                background: accent,
                boxShadow: `0 0 12px ${accent}40`,
              }}
            />
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
              {system.name}
            </p>
          </div>
          {isTall && system.lastActionText && (
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 11,
                lineHeight: 1.4,
                color: 'var(--text-3)',
                fontWeight: 300,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {system.lastActionText}
            </p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 9,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
            }}
          >
            Health
          </span>
          <span
            style={{
              fontSize: 15,
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--text-1)',
              fontWeight: 300,
            }}
          >
            {healthText}
          </span>
        </div>
      </div>
    </WidgetFrame>
  );
}
