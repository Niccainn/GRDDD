'use client';

import { useEffect, useState } from 'react';

type Settings = {
  identity: { id: string; name: string; email: string; type: string } | null;
  stats: {
    environments: number;
    systems: number;
    workflows: number;
    novaInteractions: number;
    totalTokens: number;
  };
  apiKeyConfigured: boolean;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [editName, setEditName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSettings(data);
        setEditName(data.identity?.name ?? '');
      });
  }, []);

  async function saveName() {
    if (!editName.trim()) return;
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setSettings(prev => prev ? { ...prev, identity: prev.identity ? { ...prev.identity, name: editName.trim() } : null } : null);
    setSaving(false);
    setEditingName(false);
  }

  return (
    <div className="px-10 py-10 min-h-screen max-w-2xl">
      <div className="mb-10">
        <h1 className="text-2xl font-extralight tracking-tight mb-1">Settings</h1>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Workspace configuration and status</p>
      </div>

      <div className="space-y-6">
        {/* Identity */}
        <section>
          <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-tertiary)' }}>IDENTITY</p>
          <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {!settings ? (
              <div className="h-16 animate-pulse rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-light flex-shrink-0"
                  style={{ background: 'rgba(21,173,112,0.12)', color: '#15AD70', border: '1px solid rgba(21,173,112,0.18)' }}>
                  {settings.identity?.name?.charAt(0).toUpperCase() ?? 'D'}
                </div>
                <div className="flex-1 min-w-0">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                        autoFocus
                        className="text-sm font-light px-3 py-1.5 rounded-lg focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
                      />
                      <button onClick={saveName} disabled={saving}
                        className="text-xs font-light px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
                        {saving ? '···' : 'Save'}
                      </button>
                      <button onClick={() => setEditingName(false)} className="text-xs font-light"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {settings.identity?.name ?? 'Demo User'}
                      </p>
                      <button onClick={() => setEditingName(true)}
                        className="text-xs font-light transition-colors"
                        style={{ color: 'rgba(255,255,255,0.25)' }}>
                        Edit
                      </button>
                    </div>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {settings.identity?.email ?? 'demo@grid.app'}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-md flex-shrink-0"
                  style={{ background: 'rgba(21,173,112,0.08)', border: '1px solid rgba(21,173,112,0.15)', color: '#15AD70' }}>
                  {settings.identity?.type.toLowerCase() ?? 'person'}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* API */}
        <section>
          <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-tertiary)' }}>NOVA / ANTHROPIC</p>
          <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {!settings ? (
              <div className="h-12 animate-pulse rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-light mb-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>API Key</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Set via <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', fontFamily: 'monospace' }}>ANTHROPIC_API_KEY</code> environment variable
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full"
                      style={{ background: settings.apiKeyConfigured ? '#15AD70' : '#FF6B6B' }} />
                    <span className="text-xs font-light"
                      style={{ color: settings.apiKeyConfigured ? '#15AD70' : '#FF6B6B' }}>
                      {settings.apiKeyConfigured ? 'Configured' : 'Not configured'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Model</span>
                  <code className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                    claude-opus-4-6
                  </code>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Usage stats */}
        <section>
          <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-tertiary)' }}>WORKSPACE</p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {!settings ? (
              <div className="h-40 animate-pulse" style={{ background: 'var(--surface)' }} />
            ) : (
              <div>
                {[
                  { label: 'Environments', value: settings.stats.environments },
                  { label: 'Systems', value: settings.stats.systems },
                  { label: 'Workflows', value: settings.stats.workflows },
                  { label: 'Nova interactions', value: settings.stats.novaInteractions.toLocaleString() },
                  { label: 'Total tokens used', value: settings.stats.totalTokens.toLocaleString() },
                ].map((row, i) => (
                  <div key={row.label}
                    className="flex items-center justify-between px-5 py-3"
                    style={{
                      background: 'var(--surface)',
                      borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                    }}>
                    <span className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.5)' }}>{row.label}</span>
                    <span className="text-sm font-light tabular-nums" style={{ color: 'rgba(255,255,255,0.75)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Team */}
        <section>
          <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-tertiary)' }}>TEAM</p>
          <a href="/settings/team"
            className="flex items-center justify-between px-5 py-4 rounded-xl transition-all group"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-sm font-light mb-0.5 group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Manage team members
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Add people, agents, and clients · assign roles per environment
              </p>
            </div>
            <span className="text-xs ml-4" style={{ color: 'rgba(255,255,255,0.2)' }}>→</span>
          </a>
        </section>

        {/* About */}
        <section>
          <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-tertiary)' }}>ABOUT</p>
          <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-3">
              <svg width="20" height="26" viewBox="0 0 79 100" fill="none">
                <rect x="2" y="2" width="75" height="96" rx="8" stroke="white" strokeWidth="2" strokeOpacity="0.6"/>
                <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="2" strokeOpacity="0.6"/>
                <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="2" strokeOpacity="0.6"/>
              </svg>
              <div>
                <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.7)' }}>GRID</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Adaptive Organizational Infrastructure</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              GRID structures how identity, operations, and intelligence interact across your organisation. Built with Next.js, Prisma, and Claude.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
