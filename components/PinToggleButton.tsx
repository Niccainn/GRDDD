'use client';

/**
 * PinToggleButton — small pin/unpin control for any nav item.
 * Renders a subtle pin icon on hover of the parent row; clicking
 * writes through to localStorage via togglePinned and fires the
 * grid:pinned-nav-changed event so PinnedSidebarSection rerenders.
 */

import { useEffect, useState } from 'react';
import { isPinned, togglePinned, PINNED_NAV_EVENT } from '@/lib/ui/pinned-nav';

type Props = { href: string; label: string };

export default function PinToggleButton({ href, label }: Props) {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    setPinned(isPinned(href));
    const onChange = () => setPinned(isPinned(href));
    window.addEventListener(PINNED_NAV_EVENT, onChange);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'grid:pinned-nav') onChange();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PINNED_NAV_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [href]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePinned(href);
      }}
      aria-label={pinned ? `Unpin ${label}` : `Pin ${label}`}
      title={pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
      style={{ color: pinned ? 'var(--brand)' : 'var(--text-3)' }}
    >
      <svg width="10" height="10" viewBox="0 0 12 12" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={pinned ? 0 : 1.2}>
        <path d="M4.5 1v5L2.5 8v1h7V8l-2-2V1h-3z" />
      </svg>
    </button>
  );
}
