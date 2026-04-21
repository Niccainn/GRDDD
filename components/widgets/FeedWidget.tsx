'use client';
/**
 * FeedWidget — TODAY-feed style rolling list of items.
 * Default sizes: 2x2 (short), 4x2 (wide), 4x4 (tall).
 *
 * Items fade in as they arrive; there's no ticker, no flicker. The
 * empty state is deliberately calm — "You're caught up" — never a
 * zero count.
 */
import Link from 'next/link';
import WidgetFrame from './WidgetFrame';
import type { WidgetSpec } from '@/lib/widgets/registry';

export type FeedWidgetItem = {
  id: string;
  title: string;
  subtitle?: string;
  accentColor?: string | null;
  href?: string;
  rightText?: string;
  pinned?: boolean;
};

type FeedWidgetProps = {
  spec: WidgetSpec;
  items: FeedWidgetItem[];
  emptyLabel?: string;
  editMode?: boolean;
  onRemove?: () => void;
  onOpen?: () => void;
};

export default function FeedWidget({
  spec,
  items,
  emptyLabel = "You're caught up.",
  editMode,
  onRemove,
  onOpen,
}: FeedWidgetProps) {
  // Pinned items float to the top; rest preserve their order.
  const sorted = [...items].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return 0;
  });

  return (
    <WidgetFrame
      size={spec.size}
      title={spec.title}
      subtitle={spec.subtitle}
      editMode={editMode}
      onRemove={onRemove}
      onOpen={onOpen}
    >
      {items.length === 0 ? (
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-3)',
            margin: 0,
            fontWeight: 300,
          }}
        >
          {emptyLabel}
        </p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            overflow: 'hidden',
          }}
        >
          {sorted.map(item => {
            const row = (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 2px',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 6,
                    flexShrink: 0,
                    background: item.accentColor ?? 'var(--brand)',
                    opacity: item.pinned ? 1 : 0.5,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 400,
                      color: 'var(--text-1)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.title}
                  </p>
                  {item.subtitle && (
                    <p
                      style={{
                        margin: '1px 0 0',
                        fontSize: 10,
                        color: 'var(--text-3)',
                        fontWeight: 300,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.subtitle}
                    </p>
                  )}
                </div>
                {item.rightText && (
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-3)',
                      flexShrink: 0,
                    }}
                  >
                    {item.rightText}
                  </span>
                )}
              </div>
            );
            return item.href ? (
              <Link
                key={item.id}
                href={item.href}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {row}
              </Link>
            ) : (
              row
            );
          })}
        </div>
      )}
    </WidgetFrame>
  );
}
