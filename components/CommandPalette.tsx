'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type SearchResult = {
  environments: { id: string; name: string; slug: string; color: string | null }[];
  systems: { id: string; name: string; color: string | null; healthScore: number | null; environment: { name: string } }[];
  workflows: { id: string; name: string; status: string; system: { name: string } }[];
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#15AD70', DRAFT: 'rgba(255,255,255,0.3)',
  PAUSED: '#F7C700', COMPLETED: '#7193ED', ARCHIVED: 'rgba(255,255,255,0.15)',
};

const NAV_SHORTCUTS = [
  { label: 'Operate', href: '/dashboard', icon: '⊙', hint: 'Dashboard' },
  { label: 'Environments', href: '/environments', icon: '⬡', hint: 'All environments' },
  { label: 'Systems', href: '/systems', icon: '⊞', hint: 'All systems' },
  { label: 'Workflows', href: '/workflows', icon: '⇌', hint: 'All workflows' },
  { label: 'Nova', href: '/nova', icon: '⚡', hint: 'Intelligence log' },
  { label: 'Inbox', href: '/inbox', icon: '✉', hint: 'Signals & incoming work' },
  { label: 'Goals', href: '/goals', icon: '◎', hint: 'OKR tracking' },
  { label: 'Analytics', href: '/analytics', icon: '∿', hint: 'Performance data' },
  { label: 'Reports', href: '/reports', icon: '⊡', hint: 'Nova-generated reports' },
  { label: 'Integrations', href: '/integrations', icon: '⊕', hint: 'Connected tools' },
  { label: 'Settings', href: '/settings', icon: '⚙', hint: 'Workspace settings' },
];

const ACTION_COMMANDS = [
  { label: 'Create environment', href: '/environments', icon: '+', hint: 'New organizational container', section: 'action' },
  { label: 'Create workflow', href: '/workflows', icon: '+', hint: 'New executable process', section: 'action' },
  { label: 'Ask Nova', href: '/nova', icon: '⚡', hint: 'Query the intelligence engine', section: 'action' },
  { label: 'Generate report', href: '/reports', icon: '⊡', hint: 'Nova-powered analysis', section: 'action' },
  { label: 'View audit log', href: '/audit', icon: '☰', hint: 'Immutable activity history', section: 'action' },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ environments: [], systems: [], workflows: [] });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global ⌘K listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults({ environments: [], systems: [], workflows: [] });
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ environments: [], systems: [], workflows: [] });
      setSelected(0);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await r.json();
        setResults(data);
        setSelected(0);
      } finally {
        setLoading(false);
      }
    }, 150);
  }, [query]);

  // Flat list of all navigable items for keyboard nav
  const allItems = useCallback((): { href: string; label: string }[] => {
    if (!query.trim()) return [...NAV_SHORTCUTS.map(n => ({ href: n.href, label: n.label })), ...ACTION_COMMANDS.map(a => ({ href: a.href, label: a.label }))];
    return [
      ...results.environments.map(e => ({ href: `/environments/${e.slug}`, label: e.name })),
      ...results.systems.map(s => ({ href: `/systems/${s.id}`, label: s.name })),
      ...results.workflows.map(w => ({ href: `/workflows/${w.id}`, label: w.name })),
    ];
  }, [query, results]);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const items = allItems();
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(i => Math.min(i + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[selected];
      if (item) navigate(item.href);
    }
  }

  const hasResults = results.environments.length + results.systems.length + results.workflows.length > 0;
  const isEmpty = !query.trim();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--surface-2, #1a1a1a)', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {loading ? (
            <span className="w-4 h-4 rounded-full border border-t-transparent animate-spin flex-shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'transparent' }} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search or jump to···"
            className="flex-1 bg-transparent text-sm font-light focus:outline-none"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          />
          <kbd className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', fontFamily: 'inherit' }}>
            esc
          </kbd>
        </div>

        {/* Results / shortcuts */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {isEmpty && (
            <div className="py-2">
              <p className="text-xs px-4 py-2 tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.2)' }}>NAVIGATE</p>
              {NAV_SHORTCUTS.map((item, i) => (
                <button key={item.href} onClick={() => navigate(item.href)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                  style={{ background: selected === i ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                  onMouseEnter={() => setSelected(i)}>
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-light flex-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.label}</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>{item.hint}</span>
                </button>
              ))}
              <p className="text-xs px-4 py-2 mt-2 tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.2)' }}>ACTIONS</p>
              {ACTION_COMMANDS.map((item, i) => (
                <button key={item.label} onClick={() => navigate(item.href)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                  style={{ background: selected === NAV_SHORTCUTS.length + i ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                  onMouseEnter={() => setSelected(NAV_SHORTCUTS.length + i)}>
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: 'rgba(21,173,112,0.08)', color: '#15AD70' }}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-light flex-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.label}</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>{item.hint}</span>
                </button>
              ))}
            </div>
          )}

          {!isEmpty && !hasResults && !loading && (
            <div className="flex flex-col items-center py-10">
              <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>No results for "{query}"</p>
            </div>
          )}

          {!isEmpty && hasResults && (() => {
            let idx = 0;
            const sections = [];

            if (results.environments.length > 0) {
              sections.push(
                <div key="envs" className="py-2">
                  <p className="text-xs px-4 py-1.5 tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.2)' }}>ENVIRONMENTS</p>
                  {results.environments.map(env => {
                    const i = idx++;
                    return (
                      <button key={env.id} onClick={() => navigate(`/environments/${env.slug}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                        style={{ background: selected === i ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                        onMouseEnter={() => setSelected(i)}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: env.color ?? 'rgba(255,255,255,0.2)' }} />
                        <span className="text-sm font-light flex-1" style={{ color: 'rgba(255,255,255,0.75)' }}>{env.name}</span>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>/{env.slug}</span>
                      </button>
                    );
                  })}
                </div>
              );
            }

            if (results.systems.length > 0) {
              sections.push(
                <div key="sys" className="py-2" style={{ borderTop: results.environments.length > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <p className="text-xs px-4 py-1.5 tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.2)' }}>SYSTEMS</p>
                  {results.systems.map(sys => {
                    const i = idx++;
                    const score = sys.healthScore ? Math.round(sys.healthScore * 100) : null;
                    const scoreColor = score === null ? null : score >= 80 ? '#15AD70' : score >= 60 ? '#F7C700' : '#FF6B6B';
                    return (
                      <button key={sys.id} onClick={() => navigate(`/systems/${sys.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                        style={{ background: selected === i ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                        onMouseEnter={() => setSelected(i)}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: sys.color ?? 'rgba(255,255,255,0.2)' }} />
                        <span className="text-sm font-light flex-1" style={{ color: 'rgba(255,255,255,0.75)' }}>{sys.name}</span>
                        <span className="text-xs mr-2" style={{ color: 'rgba(255,255,255,0.2)' }}>{sys.environment.name}</span>
                        {score !== null && (
                          <span className="text-xs tabular-nums" style={{ color: scoreColor ?? undefined }}>{score}%</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            }

            if (results.workflows.length > 0) {
              sections.push(
                <div key="wf" className="py-2" style={{ borderTop: (results.environments.length + results.systems.length) > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <p className="text-xs px-4 py-1.5 tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.2)' }}>WORKFLOWS</p>
                  {results.workflows.map(wf => {
                    const i = idx++;
                    return (
                      <button key={wf.id} onClick={() => navigate(`/workflows/${wf.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                        style={{ background: selected === i ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                        onMouseEnter={() => setSelected(i)}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: STATUS_COLOR[wf.status] ?? 'rgba(255,255,255,0.2)' }} />
                        <span className="text-sm font-light flex-1" style={{ color: 'rgba(255,255,255,0.75)' }}>{wf.name}</span>
                        <span className="text-xs mr-2" style={{ color: 'rgba(255,255,255,0.2)' }}>{wf.system.name}</span>
                        <span className="text-xs" style={{ color: STATUS_COLOR[wf.status] ?? 'rgba(255,255,255,0.3)' }}>
                          {wf.status.toLowerCase()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            }

            return sections;
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { keys: ['↑', '↓'], label: 'navigate' },
            { keys: ['↵'], label: 'open' },
            { keys: ['esc'], label: 'close' },
          ].map(({ keys, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              {keys.map(k => (
                <kbd key={k} className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)', fontFamily: 'inherit' }}>
                  {k}
                </kbd>
              ))}
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>{label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <kbd className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)', fontFamily: 'inherit' }}>
              ⌘K
            </kbd>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>toggle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
