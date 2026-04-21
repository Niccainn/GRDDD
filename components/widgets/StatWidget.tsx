'use client';
/**
 * StatWidget — single big number with optional label + spark.
 * Default sizes: 1x1 (number only) or 2x1 (number + label + spark).
 *
 * Numbers fade in rather than tick; that's the Grid discipline —
 * silence first. No count-up animations; too noisy, drains attention.
 */
import { useEffect, useState } from 'react';
import WidgetFrame from './WidgetFrame';
import type { WidgetSpec } from '@/lib/widgets/registry';
import { DURATION, EASE } from '@/lib/widgets/motion';

type StatWidgetProps = {
  spec: WidgetSpec;
  value: string | number;
  delta?: { value: number; label?: string } | null;
  spark?: number[] | null;
  editMode?: boolean;
  onRemove?: () => void;
  menuItems?: Array<{ id: string; label: string; destructive?: boolean; disabled?: boolean; onSelect: () => void }>;
  onOpen?: () => void;
};

export default function StatWidget({
  spec,
  value,
  delta,
  spark,
  editMode,
  onRemove,
  menuItems,
  onOpen,
}: StatWidgetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const isCompact = spec.size === '1x1';

  return (
    <WidgetFrame
      size={spec.size}
      title={isCompact ? undefined : spec.title}
      subtitle={isCompact ? undefined : spec.subtitle}
      editMode={editMode}
      onRemove={onRemove}
      menuItems={menuItems}
      onOpen={onOpen}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
        }}
      >
        <div>
          {isCompact && (
            <p
              style={{
                fontSize: 9,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
                margin: 0,
                marginBottom: 4,
                fontWeight: 300,
              }}
            >
              {spec.title}
            </p>
          )}
          <p
            style={{
              fontSize: isCompact ? 26 : 34,
              fontWeight: 300,
              lineHeight: 1,
              color: 'var(--text-1)',
              fontVariantNumeric: 'tabular-nums',
              margin: 0,
              opacity: mounted ? 1 : 0,
              transition: `opacity ${DURATION.settle}ms ${EASE.settle}`,
              fontFeatureSettings: '"ss01"',
            }}
          >
            {value}
          </p>
          {delta && (
            <p
              style={{
                fontSize: 10,
                margin: '6px 0 0',
                color:
                  delta.value > 0
                    ? 'var(--brand)'
                    : delta.value < 0
                      ? '#FF6B6B'
                      : 'var(--text-3)',
                fontWeight: 300,
              }}
            >
              {delta.value > 0 ? '+' : ''}
              {delta.value}
              {delta.label ? ` ${delta.label}` : ''}
            </p>
          )}
        </div>

        {spark && spark.length >= 2 && !isCompact && (
          <Spark data={spark} />
        )}
      </div>
    </WidgetFrame>
  );
}

function Spark({ data }: { data: number[] }) {
  const w = 140;
  const h = 28;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
      style={{ opacity: 0.45 }}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
