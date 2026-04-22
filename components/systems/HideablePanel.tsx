'use client';

/**
 * HideablePanel — wraps a right-rail panel on /systems/[id] and lets
 * the user hide it. Hidden IDs persist in localStorage keyed by
 * systemId (shared with the onboarding widget picker so selections
 * carry through without a DB round-trip).
 *
 * Small × control in the top-right corner, only visible on hover.
 * Hidden panels render nothing — they can be restored from the
 * System page's "Hidden panels" chip (not in this file).
 */

import { useEffect, useState } from 'react';
import {
  hiddenPresetsKey,
  readHiddenPresets,
  writeHiddenPresets,
} from '@/lib/widgets/department-catalog';

type Props = {
  systemId: string;
  presetId: string;
  children: React.ReactNode;
};

export default function HideablePanel({ systemId, presetId, children }: Props) {
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setHidden(readHiddenPresets(systemId).has(presetId));
    check();
    const storage = (e: StorageEvent) => {
      if (e.key === hiddenPresetsKey(systemId)) check();
    };
    const custom = (e: Event) => {
      const ev = e as CustomEvent<{ systemId: string }>;
      if (ev.detail?.systemId === systemId) check();
    };
    window.addEventListener('storage', storage);
    window.addEventListener('grid:hidden-panels-changed', custom);
    return () => {
      window.removeEventListener('storage', storage);
      window.removeEventListener('grid:hidden-panels-changed', custom);
    };
  }, [systemId, presetId]);

  function handleHide() {
    const next = readHiddenPresets(systemId);
    next.add(presetId);
    writeHiddenPresets(systemId, next);
  }

  // Don't render anything on the server pass; avoids SSR/CSR hydration
  // mismatch since the hidden list only exists client-side.
  if (!mounted) return <>{children}</>;
  if (hidden) return null;

  return (
    <div className="relative group">
      <button
        onClick={handleHide}
        aria-label="Hide this panel"
        title="Hide this panel"
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.45)',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round" />
        </svg>
      </button>
      {children}
    </div>
  );
}
