'use client';

import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'grid_sample_banner_dismissed';

export default function SampleDataBanner({ onClear }: { onClear?: () => void }) {
  const [visible, setVisible] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    // Two gates before showing:
    //  1. The user hasn't dismissed it before (localStorage).
    //  2. The server confirms sample-tagged data actually exists for
    //     this user. Without #2 the banner mounted for unauthenticated
    //     visitors and for users who never had sample data — both
    //     looked like a leak ("Why am I being told I'm in demo mode?").
    if (localStorage.getItem(DISMISSED_KEY)) return;
    let cancelled = false;
    fetch('/api/sample-data')
      .then(r => r.ok ? r.json() : { hasSampleData: false })
      .then(d => { if (!cancelled && d?.hasSampleData) setVisible(true); })
      .catch(() => { /* unauth or 5xx → don't show */ });
    return () => { cancelled = true; };
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await fetch('/api/sample-data', { method: 'DELETE' });
      setCleared(true);
      setTimeout(() => {
        localStorage.setItem(DISMISSED_KEY, '1');
        setVisible(false);
        onClear?.();
      }, 2000);
    } catch {
      setClearing(false);
    }
  };

  return (
    <div
      className="relative mb-6 rounded-xl border border-white/[0.08] px-5 py-4"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {cleared ? (
        <p className="text-sm font-light text-white/70">
          Sample data cleared — your workspace is ready for real work.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-lg flex-shrink-0" aria-hidden>
              i
            </span>
            <p className="text-sm font-light text-white/70">
              You&apos;re viewing sample data. This helps you explore GRID&apos;s
              features.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleClear}
              disabled={clearing}
              className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/90 disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear sample data'}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/40 transition-colors hover:text-white/70"
            >
              Keep exploring
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
