'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

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

type ThemeMode = 'dark' | 'light' | 'system';
type Density = 'comfortable' | 'compact';
type SidebarMode = 'visible' | 'hover';

const SETTINGS_NAV = [
  { id: 'profile', label: 'Profile', icon: '○' },
  { id: 'appearance', label: 'Appearance', icon: '◑', dot: true },
  { id: 'notifications', label: 'Notifications', icon: '⌁' },
  { id: 'workspace', label: 'Workspace', icon: '■' },
  { id: 'team', label: 'Team', icon: '○' },
  { id: 'billing', label: 'Billing', icon: '+' },
  { id: 'api', label: 'API & Keys', icon: '⌐' },
  { id: 'security', label: 'Security', icon: '◈' },
  { id: 'admin', label: 'Admin', icon: '⚡' },
];

const QUICK_LINKS = [
  { label: 'Appearance & branding', href: '?tab=appearance' },
  { label: 'Team members', href: '/settings/team' },
  { label: 'API keys', href: '/settings/api-keys' },
  { label: 'Webhooks', href: '/settings/webhooks' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') ?? 'appearance';

  const [settings, setSettings] = useState<Settings | null>(null);
  const [editName, setEditName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);

  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [density, setDensity] = useState<Density>('comfortable');
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('visible');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setSettings(data);
      setEditName(data.identity?.name ?? '');
    });
    const storedTheme = localStorage.getItem('grid-theme') as ThemeMode | null;
    const storedDensity = localStorage.getItem('grid-density') as Density | null;
    const storedSidebar = localStorage.getItem('grid-sidebar') as SidebarMode | null;
    if (storedTheme) setThemeState(storedTheme);
    if (storedDensity) setDensity(storedDensity);
    if (storedSidebar) setSidebarMode(storedSidebar);
  }, []);

  function setTheme(mode: ThemeMode) {
    setThemeState(mode);
    localStorage.setItem('grid-theme', mode);
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', mode);
    }
  }

  function setDensityMode(d: Density) {
    setDensity(d);
    localStorage.setItem('grid-density', d);
    document.documentElement.setAttribute('data-density', d);
  }

  function setSidebar(mode: SidebarMode) {
    setSidebarMode(mode);
    localStorage.setItem('grid-sidebar', mode);
    document.documentElement.setAttribute('data-sidebar', mode);
  }

  async function saveName() {
    if (!editName.trim()) return;
    setSaving(true);
    await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editName.trim() }) });
    setSettings(prev => prev ? { ...prev, identity: prev.identity ? { ...prev.identity, name: editName.trim() } : null } : null);
    setSaving(false);
    setEditingName(false);
  }

  return (
    <div className="flex min-h-screen">
      {/* Settings sidebar */}
      <div className="w-[200px] flex-shrink-0 py-10 px-6" style={{ borderRight: '1px solid var(--glass-border)' }}>
        <p className="text-xs tracking-[0.12em] mb-5 font-light" style={{ color: 'var(--text-3)' }}>SETTINGS</p>
        <nav className="space-y-0.5 mb-8">
          {SETTINGS_NAV.map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/settings?tab=${item.id}`)}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-light transition-all text-left"
                style={{
                  color: active ? 'var(--text-1)' : 'var(--text-3)',
                  background: active ? 'var(--glass-active)' : 'transparent',
                }}
              >
                <span className="text-xs w-4 text-center" style={{ opacity: 0.5 }}>{item.icon}</span>
                {item.label}
                {item.dot && active && <span className="ml-auto w-1 h-1 rounded-full" style={{ background: 'var(--brand)' }} />}
              </button>
            );
          })}
        </nav>

        <p className="text-xs tracking-[0.12em] mb-4 font-light" style={{ color: 'var(--text-3)' }}>QUICK LINKS</p>
        <div className="space-y-1">
          {QUICK_LINKS.map(link => (
            <Link key={link.label} href={link.href}
              className="block text-xs font-light py-1.5 transition-colors"
              style={{ color: 'var(--text-3)' }}>
              {link.label} →
            </Link>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 py-10 px-10 max-w-2xl">

        {/* Appearance tab */}
        {activeTab === 'appearance' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-extralight tracking-tight mb-1">Appearance</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>Customize how GRID looks and feels</p>
            <Link href="/settings?tab=brand" className="chrome-pill px-4 py-2 text-xs font-light inline-flex items-center gap-2 mb-8"
              style={{ color: 'var(--brand)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3"/><path strokeLinecap="round" d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
              </svg>
              Open brand skin editor →
            </Link>

            <div className="glass-panel p-5 mb-4">
              <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>THEME</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'dark' as ThemeMode, label: 'Dark', icon: '■' },
                  { value: 'light' as ThemeMode, label: 'Light', icon: '□' },
                  { value: 'system' as ThemeMode, label: 'System', icon: '◑' },
                ]).map(opt => (
                  <button key={opt.value} onClick={() => setTheme(opt.value)}
                    className="chrome-pill px-4 py-3 text-sm font-light flex items-center justify-center gap-2 transition-all"
                    style={{
                      color: theme === opt.value ? 'var(--brand)' : 'var(--text-3)',
                      background: theme === opt.value ? 'var(--brand-glow)' : undefined,
                      borderColor: theme === opt.value ? 'var(--brand-border)' : undefined,
                    }}>
                    <span className="text-xs">{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel p-5 mb-4">
              <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>DENSITY</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'comfortable' as Density, label: 'Comfortable' },
                  { value: 'compact' as Density, label: 'Compact' },
                ]).map(opt => (
                  <button key={opt.value} onClick={() => setDensityMode(opt.value)}
                    className="chrome-pill px-4 py-3 text-sm font-light transition-all"
                    style={{
                      color: density === opt.value ? 'var(--text-1)' : 'var(--text-3)',
                      background: density === opt.value ? 'var(--glass-active)' : undefined,
                      borderColor: density === opt.value ? 'var(--glass-border-hover)' : undefined,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel p-5">
              <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>SIDEBAR</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'visible' as SidebarMode, label: 'Always visible' },
                  { value: 'hover' as SidebarMode, label: 'Hover to expand' },
                ]).map(opt => (
                  <button key={opt.value} onClick={() => setSidebar(opt.value)}
                    className="chrome-pill px-4 py-3 text-sm font-light transition-all"
                    style={{
                      color: sidebarMode === opt.value ? 'var(--text-1)' : 'var(--text-3)',
                      background: sidebarMode === opt.value ? 'var(--glass-active)' : undefined,
                      borderColor: sidebarMode === opt.value ? 'var(--glass-border-hover)' : undefined,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-extralight tracking-tight mb-1">Profile</h2>
            <p className="text-xs mb-8" style={{ color: 'var(--text-3)' }}>Your identity in this workspace</p>
            <div className="glass-panel p-6">
              {!settings ? (
                <div className="h-16 animate-pulse rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-light flex-shrink-0"
                    style={{ background: 'var(--brand-glow)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
                    {settings.identity?.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingName ? (
                      <div className="flex items-center gap-2">
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                          autoFocus className="glass-input text-sm px-3 py-1.5" />
                        <button onClick={saveName} disabled={saving} className="chrome-pill px-3 py-1.5 text-xs font-light"
                          style={{ color: 'var(--text-2)' }}>{saving ? '···' : 'Save'}</button>
                        <button onClick={() => setEditingName(false)} className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>{settings.identity?.name ?? user?.name}</p>
                        <button onClick={() => setEditingName(true)} className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Edit</button>
                      </div>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{settings.identity?.email ?? user?.email}</p>
                  </div>
                  <span className="chrome-pill px-3 py-1 text-xs font-light" style={{ color: 'var(--brand)' }}>
                    {settings.identity?.type.toLowerCase() ?? 'person'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workspace tab */}
        {activeTab === 'workspace' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-extralight tracking-tight mb-1">Workspace</h2>
            <p className="text-xs mb-8" style={{ color: 'var(--text-3)' }}>Workspace stats and Nova configuration</p>

            <div className="glass-panel p-5 mb-6">
              <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>NOVA / ANTHROPIC</p>
              {settings && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-light" style={{ color: 'var(--text-2)' }}>API Key</span>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: settings.apiKeyConfigured ? 'var(--brand)' : 'var(--danger)' }} />
                      <span className="text-xs font-light" style={{ color: settings.apiKeyConfigured ? 'var(--brand)' : 'var(--danger)' }}>
                        {settings.apiKeyConfigured ? 'Configured' : 'Not configured'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <span className="text-sm font-light" style={{ color: 'var(--text-2)' }}>Model</span>
                    <code className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--glass)', fontFamily: 'monospace', color: 'var(--text-3)' }}>claude-sonnet-4-6</code>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-panel overflow-hidden">
              {settings && [
                { label: 'Environments', value: settings.stats.environments },
                { label: 'Systems', value: settings.stats.systems },
                { label: 'Workflows', value: settings.stats.workflows },
                { label: 'Nova interactions', value: settings.stats.novaInteractions.toLocaleString() },
                { label: 'Total tokens used', value: settings.stats.totalTokens.toLocaleString() },
              ].map((row, i) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-3"
                  style={{ borderTop: i > 0 ? '1px solid var(--glass-border)' : 'none' }}>
                  <span className="text-sm font-light" style={{ color: 'var(--text-2)' }}>{row.label}</span>
                  <span className="text-sm font-light tabular-nums" style={{ color: 'var(--text-1)' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team tab */}
        {activeTab === 'team' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-extralight tracking-tight mb-1">Team</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>Manage workspace members</p>
            <Link href="/settings/team" className="chrome px-5 py-4 flex items-center justify-between group">
              <div>
                <p className="text-sm font-light mb-0.5" style={{ color: 'var(--text-1)' }}>Manage team members</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Add people, agents, and clients · assign roles per environment</p>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>→</span>
            </Link>
          </div>
        )}

        {/* API tab */}
        {activeTab === 'api' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-extralight tracking-tight mb-1">API & Keys</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>External access and webhook configuration</p>
            <div className="space-y-3">
              <Link href="/settings/api-keys" className="chrome px-5 py-4 flex items-center justify-between group">
                <div>
                  <p className="text-sm font-light mb-0.5" style={{ color: 'var(--text-1)' }}>API Keys</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Generate keys for external integrations</p>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>→</span>
              </Link>
              <Link href="/settings/webhooks" className="chrome px-5 py-4 flex items-center justify-between group">
                <div>
                  <p className="text-sm font-light mb-0.5" style={{ color: 'var(--text-1)' }}>Webhooks</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>HTTP callbacks for executions and alerts</p>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>→</span>
              </Link>
            </div>
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-extralight tracking-tight mb-1">Security</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>Data protection and access controls</p>
            <div className="space-y-3">
              <div className="glass-panel p-5">
                <p className="text-sm font-light mb-3" style={{ color: 'var(--text-1)' }}>Data Export (GDPR)</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>Download all your data as JSON</p>
                <a href="/api/me/export" className="chrome-pill px-4 py-2 text-xs font-light inline-block" style={{ color: 'var(--text-2)' }}>
                  Export my data →
                </a>
              </div>
              <div className="glass-panel p-5">
                <p className="text-sm font-light mb-3" style={{ color: 'var(--danger)' }}>Delete Account</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>Permanently delete your account and all associated data</p>
                <button className="chrome-pill px-4 py-2 text-xs font-light" style={{ color: 'var(--danger)' }}>
                  Delete my account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fallback for unimplemented tabs */}
        {!['appearance', 'profile', 'workspace', 'team', 'api', 'security'].includes(activeTab) && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-extralight tracking-tight mb-1">{SETTINGS_NAV.find(n => n.id === activeTab)?.label ?? activeTab}</h2>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
