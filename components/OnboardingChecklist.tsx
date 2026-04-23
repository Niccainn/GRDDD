'use client';

/**
 * OnboardingChecklist — Notion / ClickUp / Monday-style onboarding
 * overlay. Non-blocking, dismissible, resumable.
 *
 * Shows as a floating panel in the bottom-right corner of any
 * authenticated page. Steps are derived from real account state
 * (fetched from /api/auth/me + /api/operate-data) — not a separate
 * "steps completed" table. That way every surface stays in sync:
 * add your name in settings, the checklist updates. Connect an
 * integration, it updates. No bookkeeping drift.
 *
 * Dismissal is per-user (localStorage flag). Minimising just
 * collapses it to a pill; the user can re-open any time from the
 * sidebar or the pill itself.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';

type Step = {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

const DISMISSED_KEY = 'grid:onboarding-checklist-dismissed';
const COLLAPSED_KEY = 'grid:onboarding-checklist-collapsed';
// Tracks whether the user has already seen the full expanded
// checklist once. On their second session we default to collapsed
// so the overlay stops blocking content — the chip stays visible
// so they can re-expand anytime.
const SEEN_KEY = 'grid:onboarding-checklist-seen';

export default function OnboardingChecklist() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [envsConnected, setEnvsConnected] = useState<number>(0);
  const [integrationsConnected, setIntegrationsConnected] = useState<number>(0);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [systems, setSystems] = useState<number>(0);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true');
      // Three-way state:
      //  1. Explicit collapse decision exists → honor it.
      //  2. No decision but SEEN_KEY is set → default to collapsed
      //     (2nd+ session; don't steal attention).
      //  3. No decision and SEEN is unset → default to expanded
      //     (first session; show the ramp).
      const explicit = localStorage.getItem(COLLAPSED_KEY);
      if (explicit === 'true') {
        setCollapsed(true);
      } else if (explicit === 'false') {
        setCollapsed(false);
      } else {
        const seen = localStorage.getItem(SEEN_KEY) === 'true';
        setCollapsed(seen);
        if (!seen) localStorage.setItem(SEEN_KEY, 'true');
      }
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    // Derive progress from real state. One fetch chain, no new DB tables.
    fetch('/api/environments')
      .then(r => r.ok ? r.json() : [])
      .then((envs: { id: string }[]) => {
        setEnvsConnected(Array.isArray(envs) ? envs.length : 0);
        if (!Array.isArray(envs) || envs.length === 0) return;
        const envId = envs[0].id;
        // Anthropic key?
        fetch(`/api/settings/anthropic-key?environmentId=${envId}`)
          .then(r => r.ok ? r.json() : { connected: false })
          .then(d => setHasKey(Boolean(d.connected)))
          .catch(() => setHasKey(false));
        // Integrations?
        fetch(`/api/integrations?environmentId=${envId}`)
          .then(r => r.ok ? r.json() : { integrations: [] })
          .then(d => setIntegrationsConnected((d.integrations ?? []).length))
          .catch(() => {});
      })
      .catch(() => {});
    // Systems
    fetch('/api/operate-data')
      .then(r => r.ok ? r.json() : null)
      .then(d => setSystems((d?.systems ?? []).length))
      .catch(() => {});
  }, []);

  const steps = useMemo<Step[]>(() => [
    {
      id: 'name',
      label: 'Add your name',
      description: 'How Nova and the dashboard address you.',
      href: '/settings',
      done: !!user?.name && !user.name.startsWith('pii:'),
    },
    {
      id: 'workspace',
      label: 'Create a workspace',
      description: 'Your environment — where systems and workflows live.',
      href: '/environments',
      done: envsConnected > 0,
    },
    {
      id: 'anthropic',
      label: 'Connect your Anthropic API key',
      description: 'BYOK — your key, your billing. Nova won\u2019t run without it.',
      href: '/settings/ai',
      done: hasKey === true,
    },
    {
      id: 'system',
      label: 'Create your first system',
      description: 'Map a business function: Marketing, Operations, Content.',
      href: '/systems',
      done: systems > 0,
    },
    {
      id: 'integration',
      label: 'Connect your first integration',
      description: 'Slack, Calendar, Notion — Nova moves across your stack.',
      href: '/integrations',
      done: integrationsConnected > 0,
    },
  ], [user?.name, envsConnected, hasKey, systems, integrationsConnected]);

  const total = steps.length;
  const complete = steps.filter(s => s.done).length;
  const allDone = complete === total;

  const dismiss = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, 'true'); } catch {}
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_KEY, next ? 'true' : 'false'); } catch {}
      return next;
    });
  }, []);

  // Hide entirely if dismissed, not yet loaded, or everything is done.
  if (dismissed === null) return null;
  if (dismissed) return null;
  if (allDone) return null;

  // Collapsed pill — small persistent reminder.
  if (collapsed) {
    return (
      <button
        onClick={toggleCollapse}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs font-light transition-all hover:scale-[1.02] shadow-lg"
        style={{
          background: 'var(--brand-soft)',
          border: '1px solid var(--brand-border)',
          color: 'var(--brand)',
          backdropFilter: 'blur(20px)',
        }}
        aria-label="Resume setup"
      >
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium"
          style={{ background: 'var(--brand)', color: '#000' }}
        >
          {complete}/{total}
        </span>
        Resume setup
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[340px] rounded-2xl p-5 animate-fade-in"
      style={{
        background: 'rgba(8,8,12,0.94)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] tracking-[0.16em] uppercase font-light mb-1.5" style={{ color: 'var(--brand)' }}>
            Setup · {complete} of {total}
          </p>
          <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
            Finish setting up your workspace
          </p>
        </div>
        <div className="flex items-center gap-1 -mr-1.5 -mt-1.5">
          <button
            onClick={toggleCollapse}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-all hover:bg-white/5"
            title="Minimize"
            style={{ color: 'var(--text-3)' }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M2 5.5h7" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={dismiss}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-all hover:bg-white/5"
            title="Dismiss"
            style={{ color: 'var(--text-3)' }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M1 1l8 8M9 1l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-0.5 rounded-full mb-5 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(complete / total) * 100}%`,
            background: 'var(--brand)',
          }}
        />
      </div>

      <div className="space-y-1">
        {steps.map(s => (
          <Link
            key={s.id}
            href={s.href}
            className="flex items-start gap-3 px-2 py-2 rounded-lg transition-all hover:bg-white/[0.03] group"
          >
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors"
              style={{
                background: s.done ? 'var(--brand)' : 'transparent',
                border: s.done ? '1px solid var(--brand)' : '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {s.done && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#000" strokeWidth="1.5">
                  <path d="M1.5 4l1.5 1.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-light"
                style={{
                  color: s.done ? 'var(--text-3)' : 'var(--text-1)',
                  textDecoration: s.done ? 'line-through' : undefined,
                }}
              >
                {s.label}
              </p>
              {!s.done && (
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                  {s.description}
                </p>
              )}
            </div>
            {!s.done && (
              <span
                className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                style={{ color: 'var(--brand)' }}
              >
                →
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
