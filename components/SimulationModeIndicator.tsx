'use client';

/**
 * SimulationModeIndicator — global pill that confirms the user is in
 * sandboxed mode.
 *
 * The trust contract requires the user to know, at every moment,
 * whether Nova's actions are real or simulated. /integrations
 * surfaces this only when the user happens to land there. This is
 * the persistent surface — visible on every authenticated page.
 *
 * Compact by default (small chip in the bottom-left, above the legal
 * footer). Click to expand a short panel explaining what's
 * sandboxed and how to enable live writes. ESC or click-outside to
 * collapse.
 *
 * Renders nothing when liveWritesEnabled === true. When live, the
 * absence of the chip is the affordance — no clutter, just trust.
 */
import { useEffect, useState } from 'react';

type Health = {
  liveWritesEnabled: boolean;
  implementedCount?: number;
  totalProviders?: number;
  notes?: { simulationMode?: string | null };
};

const STORAGE_KEY = 'grid:sim-mode-cache';
// Cache the health response for 5 minutes — env var changes require
// a deploy, so polling more often is wasted bandwidth.
const CACHE_TTL_MS = 5 * 60 * 1000;

type Cached = { at: number; data: Health };

function readCache(): Health | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: Health) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {/* quota / private mode — non-fatal */}
}

export default function SimulationModeIndicator() {
  const [health, setHealth] = useState<Health | null>(() => readCache());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Refresh in background regardless of cache hit so the chip
    // catches up to a flag flip on the next page nav. Auth-gated
    // endpoint — failures (401, 5xx) are silent; we just keep
    // showing the cached state or nothing.
    fetch('/api/integrations/health', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((data: Health | null) => {
        if (!data) return;
        setHealth(data);
        writeCache(data);
      })
      .catch(() => {/* silent */});
  }, []);

  // ESC closes the expanded panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Render nothing when live writes are on. The absence of the
  // chip is itself the signal — "nothing here means everything is
  // real." See the module header for why.
  if (!health || health.liveWritesEnabled) return null;

  return (
    <>
      {/* Compact pill — fixed bottom-left so it doesn't compete with
          the persistent Nova bar in the bottom-right. md:fixed only;
          on mobile we let BottomNav own the bottom edge. */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Simulation mode active — click for details"
        aria-expanded={open}
        className="hidden md:flex fixed bottom-4 left-4 z-30 items-center gap-2 px-3 py-1.5 rounded-full transition-all"
        style={{
          background: 'rgba(245,215,110,0.06)',
          border: '1px solid rgba(245,215,110,0.25)',
          color: '#F5D76E',
          fontSize: '11px',
          fontWeight: 300,
          letterSpacing: '0.04em',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          aria-hidden
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#F5D76E', boxShadow: '0 0 6px rgba(245,215,110,0.6)' }}
        />
        Simulation
      </button>

      {/* Expanded panel — opens above the chip */}
      {open && (
        <>
          <div
            className="hidden md:block fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sim-mode-title"
            className="hidden md:flex fixed bottom-14 left-4 z-40 flex-col gap-3 p-4 rounded-2xl w-[320px]"
            style={{
              background: 'var(--glass-deep, rgba(8,8,10,0.92))',
              border: '1px solid rgba(245,215,110,0.2)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: '#F5D76E', boxShadow: '0 0 8px rgba(245,215,110,0.6)' }}
              />
              <div>
                <p
                  id="sim-mode-title"
                  className="text-sm font-light tracking-tight"
                  style={{ color: 'var(--text-1)' }}
                >
                  Simulation mode
                </p>
                <p
                  className="text-xs font-light mt-1 leading-relaxed"
                  style={{ color: 'var(--text-3)' }}
                >
                  Nova&apos;s write tools return simulated success without calling provider APIs.
                  Reads are real — drafts, lists, traces all work. Writes (post to Slack, send
                  email, create Notion page) do not fire.
                </p>
              </div>
            </div>

            <div
              className="text-[11px] font-light px-3 py-2 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--text-3)',
              }}
            >
              <span style={{ color: 'var(--text-2)' }}>Why this is on:</span> closed-beta default.
              Real writes stay off until <code style={{ color: '#F5D76E' }}>NOVA_TOOLS_LIVE=1</code>{' '}
              is set on the server.
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <a
                href="/integrations"
                className="text-[11px] font-light transition-colors"
                style={{ color: 'var(--text-3)' }}
                onClick={() => setOpen(false)}
              >
                See connected integrations →
              </a>
              <button
                onClick={() => setOpen(false)}
                className="text-[11px] font-light px-2.5 py-1 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-2)',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
