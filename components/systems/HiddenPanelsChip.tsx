'use client';

/**
 * HiddenPanelsChip — a small pill shown above the right rail that
 * lets the user restore hidden panels. Zero-visual-noise when
 * nothing is hidden; otherwise shows "N hidden · Restore all".
 */

import { useEffect, useState } from 'react';
import {
  hiddenPresetsKey,
  readHiddenPresets,
  writeHiddenPresets,
} from '@/lib/widgets/department-catalog';

export default function HiddenPanelsChip({ systemId }: { systemId: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(readHiddenPresets(systemId).size);
    refresh();
    const storage = (e: StorageEvent) => {
      if (e.key === hiddenPresetsKey(systemId)) refresh();
    };
    const custom = (e: Event) => {
      const ev = e as CustomEvent<{ systemId: string }>;
      if (ev.detail?.systemId === systemId) refresh();
    };
    window.addEventListener('storage', storage);
    window.addEventListener('grid:hidden-panels-changed', custom);
    return () => {
      window.removeEventListener('storage', storage);
      window.removeEventListener('grid:hidden-panels-changed', custom);
    };
  }, [systemId]);

  if (count === 0) return null;

  function restoreAll() {
    writeHiddenPresets(systemId, new Set());
  }

  return (
    <button
      onClick={restoreAll}
      className="text-[11px] font-light px-3 py-1 rounded-full mb-3"
      style={{
        background: 'rgba(99,149,255,0.08)',
        border: '1px solid rgba(99,149,255,0.2)',
        color: '#6395FF',
      }}
    >
      {count} hidden · Restore all
    </button>
  );
}
