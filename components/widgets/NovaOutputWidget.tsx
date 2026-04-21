'use client';
/**
 * NovaOutputWidget — any Nova response pinned to a canvas.
 *
 * The "pin this answer" verb. Once a Nova response is pinned, it
 * lives on the canvas and auto-refreshes per its refresh policy.
 * Most Nova answers are pinned at 2×2; long outputs upsize to 4×2.
 */
import WidgetFrame from './WidgetFrame';
import type { WidgetSpec } from '@/lib/widgets/registry';

type NovaOutputWidgetProps = {
  spec: WidgetSpec;
  output: {
    headline: string;
    body?: string;
    reasoning?: string;
    confidence?: number;
    lastUpdatedAt?: string | null;
  };
  editMode?: boolean;
  onRemove?: () => void;
  onOpen?: () => void;
};

export default function NovaOutputWidget({
  spec,
  output,
  editMode,
  onRemove,
  onOpen,
}: NovaOutputWidgetProps) {
  const confidencePct =
    output.confidence != null ? Math.round(output.confidence * 100) : null;

  return (
    <WidgetFrame
      size={spec.size}
      editMode={editMode}
      onRemove={onRemove}
      onOpen={onOpen}
      accent="#BF9FF1"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <p
            style={{
              margin: 0,
              fontSize: 9,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(191,159,241,0.7)',
              fontWeight: 400,
            }}
          >
            Nova
          </p>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 14,
              lineHeight: 1.4,
              color: 'var(--text-1)',
              fontWeight: 400,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {output.headline}
          </p>
          {output.body && (
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 11,
                lineHeight: 1.5,
                color: 'var(--text-3)',
                fontWeight: 300,
                display: '-webkit-box',
                WebkitLineClamp: spec.size === '4x2' ? 4 : 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {output.body}
            </p>
          )}
        </div>

        {confidencePct != null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 9,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
              }}
            >
              Confidence
            </span>
            <div
              style={{
                flex: 1,
                height: 2,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${confidencePct}%`,
                  height: '100%',
                  background:
                    'linear-gradient(90deg, rgba(191,159,241,0.5), #BF9FF1)',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 10,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-3)',
              }}
            >
              {confidencePct}%
            </span>
          </div>
        )}
      </div>
    </WidgetFrame>
  );
}
