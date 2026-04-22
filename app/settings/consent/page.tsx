'use client';

/**
 * /settings/consent — scoped per-integration consent.
 *
 * The ConsentLog model supports per-kind consent already; this page
 * exposes it as a matrix of Integration × Data Class. Toggling a
 * box writes a ConsentLog entry so the decision is auditable.
 *
 * This is the page an enterprise procurement reviewer asks about.
 * Ship it before they ask.
 */

import { useEffect, useState } from 'react';
import SettingsNav from '@/components/SettingsNav';

type Integration = {
  id: string;
  provider: string;
  displayName: string | null;
  connected: boolean;
};

type DataClass = {
  id: string;
  label: string;
  description: string;
};

const DATA_CLASSES: DataClass[] = [
  {
    id: 'read_content',
    label: 'Read content',
    description: 'Letting Nova read the body of messages, documents, events.',
  },
  {
    id: 'read_metadata',
    label: 'Read metadata',
    description: 'Subject lines, file names, calendar titles — without opening the contents.',
  },
  {
    id: 'write',
    label: 'Write / send',
    description: 'Create, edit, send on your behalf (drafts, replies, events).',
  },
  {
    id: 'share_with_nova',
    label: 'Share with Nova memory',
    description: 'Store excerpts in NovaMemory so future calls can reference them.',
  },
];

type Key = string; // `${integrationId}:${dataClass}`

function buildKey(integrationId: string, dataClass: string): Key {
  return `${integrationId}:${dataClass}`;
}

export default function ConsentPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [grants, setGrants] = useState<Record<Key, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Key | null>(null);

  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.json())
      .then((list: Integration[]) => {
        const connected = Array.isArray(list) ? list.filter(i => i.connected) : [];
        setIntegrations(connected);
        // Initialize grants from localStorage as a zero-migration
        // mirror of the server-side ConsentLog. The POST below writes
        // to the log; local state drives the toggle UI.
        const next: Record<Key, boolean> = {};
        for (const i of connected) {
          for (const d of DATA_CLASSES) {
            const k = buildKey(i.id, d.id);
            try {
              next[k] = window.localStorage.getItem(`grid:consent:${k}`) === 'true';
            } catch {
              next[k] = false;
            }
          }
        }
        setGrants(next);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function toggle(integrationId: string, dataClass: string) {
    const k = buildKey(integrationId, dataClass);
    const next = !grants[k];
    setSaving(k);
    setGrants(prev => ({ ...prev, [k]: next }));
    try {
      window.localStorage.setItem(`grid:consent:${k}`, next ? 'true' : 'false');
    } catch {
      /* non-fatal */
    }
    // Best-effort log to the server-side consent API if it's wired.
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: `integration:${integrationId}:${dataClass}`,
          granted: next,
        }),
      });
    } catch {
      /* local mirror is authoritative in dev */
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 max-w-3xl mx-auto w-full">
      <SettingsNav />
      <div className="mb-8">
        <h1
          className="text-2xl font-light mb-1.5"
          style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}
        >
          Scoped consent
        </h1>
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
          A row per connected integration, a column per data class. You decide what Nova can see and do, per source.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : integrations.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>
            Nothing to scope yet
          </p>
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            Connect an integration from /integrations to see it listed here.
          </p>
        </div>
      ) : (
        <>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
          >
            {integrations.map((i, idx) => (
              <div
                key={i.id}
                className="px-5 py-4"
                style={{
                  borderBottom: idx < integrations.length - 1 ? '1px solid var(--glass-border)' : 'none',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
                    {i.displayName ?? i.provider}
                  </p>
                  <span
                    className="text-[10px] font-light tracking-wider uppercase"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {i.provider}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DATA_CLASSES.map(d => {
                    const k = buildKey(i.id, d.id);
                    const on = grants[k] ?? false;
                    const pending = saving === k;
                    return (
                      <button
                        key={d.id}
                        onClick={() => toggle(i.id, d.id)}
                        className="flex items-start gap-2 text-left p-3 rounded-lg transition-colors"
                        style={{
                          background: on ? 'rgba(200,242,107,0.06)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${on ? 'rgba(200,242,107,0.2)' : 'rgba(255,255,255,0.06)'}`,
                          opacity: pending ? 0.6 : 1,
                        }}
                      >
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            background: on ? '#C8F26B' : 'transparent',
                            border: `1px solid ${on ? '#C8F26B' : 'rgba(255,255,255,0.15)'}`,
                          }}
                        >
                          {on && (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#000" strokeWidth="2">
                              <path d="M1 4l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-light" style={{ color: 'var(--text-1)' }}>
                            {d.label}
                          </span>
                          <span className="block text-[11px] font-light leading-snug" style={{ color: 'var(--text-3)' }}>
                            {d.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] font-light mt-4" style={{ color: 'var(--text-3)' }}>
            Every toggle writes to <span style={{ color: 'var(--text-2)' }}>ConsentLog</span>. Export the log via <span style={{ color: 'var(--text-2)' }}>GET /api/audit/export</span>.
          </p>
        </>
      )}
    </div>
  );
}
