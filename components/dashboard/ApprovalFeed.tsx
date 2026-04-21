'use client';
/**
 * TODAY feed — the workhorse of Modes B + C.
 * Per PHASE_3_COCKPIT.md: every item has a clear noun, a specific
 * Nova action, inline actions, and disappears once handled.
 *
 * Items come from a mix of: pending Signals, waiting Workflow
 * approvals, and Nova-generated drafts. We fetch from a single
 * /api/dashboard/feed endpoint; if that endpoint doesn't exist yet
 * the feed renders an empty "caught up" state — intentionally no
 * metric theatre, so the page never shows "0" or "—".
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

export type FeedItem = {
  id: string;
  systemId: string;
  systemName: string;
  systemColor: string | null;
  actionText: string;
  needsReview: boolean;
  createdAt: string;
  href: string;
};

const MAX_VISIBLE = 20;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function ApprovalFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/feed')
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (cancelled) return;
        setItems(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pin "needs review" to top; rest by recency.
  const sorted = [...items].sort((a, b) => {
    if (a.needsReview !== b.needsReview) return a.needsReview ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const visible = showAll ? sorted : sorted.slice(0, MAX_VISIBLE);

  if (!loaded) return null;

  if (items.length === 0) {
    return (
      <p className="text-sm font-light py-6" style={{ color: 'var(--text-3)' }}>
        Nova has nothing waiting. You&apos;re caught up.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {visible.map(item => (
        <Link
          key={item.id}
          href={item.href}
          className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/[0.04]"
          style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: item.systemColor ?? '#7193ED' }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-medium mb-0.5 truncate"
              style={{ color: 'var(--text-2)' }}
            >
              {item.systemName}
            </p>
            <p
              className="text-sm font-light truncate"
              style={{ color: 'var(--text-1)' }}
            >
              {item.actionText}
            </p>
          </div>
          {item.needsReview && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: 'var(--nova-soft)',
                color: 'var(--nova)',
                border: '1px solid rgba(191,159,241,0.2)',
              }}
            >
              Review
            </span>
          )}
          <span
            className="text-[10px] flex-shrink-0"
            style={{ color: 'var(--text-3)' }}
          >
            {timeAgo(item.createdAt)}
          </span>
        </Link>
      ))}

      {sorted.length > MAX_VISIBLE && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-2 text-xs font-light"
          style={{ color: 'var(--text-3)' }}
        >
          Show {sorted.length - MAX_VISIBLE} more
        </button>
      )}
    </div>
  );
}
