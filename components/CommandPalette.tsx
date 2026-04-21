'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type SearchResultItem = {
  id: string;
  title: string;
  type: string;
  subtitle: string | null;
  href: string;
  icon: string;
};

type SearchResponse = {
  results: Record<string, SearchResultItem[]>;
};

// Section display config: label and order
const SECTION_META: Record<string, { label: string; order: number }> = {
  systems: { label: 'SYSTEMS', order: 0 },
  workflows: { label: 'WORKFLOWS', order: 1 },
  environments: { label: 'ENVIRONMENTS', order: 2 },
  goals: { label: 'GOALS', order: 3 },
  tasks: { label: 'TASKS', order: 4 },
  agents: { label: 'AGENTS', order: 5 },
  executions: { label: 'EXECUTIONS', order: 6 },
};

// Icons per type -- small inline SVGs matching the sidebar icon style
const TYPE_ICONS: Record<string, React.ReactNode> = {
  system: (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="4.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M5 4.5V3.5C5 2.95 5.45 2.5 6 2.5H9C9.55 2.5 10 2.95 10 3.5V4.5" stroke="currentColor" strokeWidth="1.1"/>
      <circle cx="7.5" cy="8.5" r="1.25" stroke="currentColor" strokeWidth="1.1"/>
    </svg>
  ),
  workflow: (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <circle cx="3" cy="3" r="1.75" stroke="currentColor" strokeWidth="1.1"/>
      <circle cx="12" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.1"/>
      <circle cx="3" cy="12" r="1.75" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M4.75 3H8C9.1 3 10 3.9 10 5v1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      <path d="M4.75 12H8C9.1 12 10 11.1 10 10V9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  ),
  environment: (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5L13 4.75V11.25L7.5 14.5L2 11.25V4.75L7.5 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
    </svg>
  ),
  goal: (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.1"/>
      <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.1"/>
    </svg>
  ),
  task: (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <rect x="2" y="2" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M5 7.5l1.5 1.5 3.5-3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  agent: (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5L12.5 4.5V10.5L7.5 13.5L2.5 10.5V4.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
      <circle cx="7.5" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.1"/>
    </svg>
  ),
  execution: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
    </svg>
  ),
};

const NAV_SHORTCUTS = [
  { label: 'Dashboard', href: '/dashboard', hint: 'Home', icon: 'home' },
  { label: 'Nova', href: '/nova', hint: 'Intelligence engine', icon: 'nova' },
  { label: 'Tasks', href: '/tasks', hint: 'Your work items', icon: 'task' },
  { label: 'Inbox', href: '/inbox', hint: 'Signals & incoming', icon: 'inbox' },
  { label: 'Environments', href: '/environments', hint: 'All environments', icon: 'environment' },
  { label: 'Systems', href: '/systems', hint: 'All systems', icon: 'system' },
  { label: 'Workflows', href: '/workflows', hint: 'All workflows', icon: 'workflow' },
  { label: 'Agents', href: '/agents', hint: 'Prompt agents', icon: 'agent' },
  { label: 'Goals', href: '/goals', hint: 'OKR tracking', icon: 'goal' },
  { label: 'Calendar', href: '/calendar', hint: 'Schedule', icon: 'calendar' },
  { label: 'Integrations', href: '/integrations', hint: 'Connected services', icon: 'integration' },
  { label: 'Documents', href: '/docs', hint: 'Docs & artifacts', icon: 'document' },
  { label: 'Templates', href: '/templates', hint: 'System & workflow templates', icon: 'template' },
  { label: 'Mastery', href: '/mastery', hint: 'Learning curve', icon: 'analytics' },
  { label: 'Finance', href: '/finance', hint: 'Revenue & spend', icon: 'finance' },
  { label: 'Time Tracking', href: '/time', hint: 'Hours & timers', icon: 'time' },
  { label: 'Forms', href: '/forms', hint: 'Intake forms', icon: 'form' },
  { label: 'Views', href: '/views', hint: 'Saved views', icon: 'view' },
  { label: 'Approvals', href: '/approvals', hint: 'Pending approvals', icon: 'approval' },
  { label: 'Assets', href: '/assets', hint: 'Files & media', icon: 'asset' },
  { label: 'Automations', href: '/automations', hint: 'Triggers & rules', icon: 'automation' },
  { label: 'Dashboards', href: '/dashboards', hint: 'Custom boards', icon: 'dashboard' },
  { label: 'Analytics', href: '/analytics', hint: 'Performance data', icon: 'analytics' },
  { label: 'Reports', href: '/reports', hint: 'Generated reports', icon: 'report' },
  { label: 'Audit', href: '/audit', hint: 'Audit log', icon: 'audit' },
  { label: 'Activity', href: '/activity', hint: 'Activity feed', icon: 'activity' },
  { label: 'Settings', href: '/settings', hint: 'Workspace config', icon: 'settings' },
];

const QUICK_ACTIONS = [
  { label: 'New Environment', href: '/environments', hint: 'Create container', icon: 'create' },
  { label: 'New Workflow', href: '/workflows', hint: 'Build a process', icon: 'create' },
  { label: 'Ask Nova', href: '/nova', hint: 'Query intelligence', icon: 'nova' },
  { label: 'View Audit Log', href: '/audit', hint: 'Activity history', icon: 'audit' },
];

const NAV_ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <path d="M2.5 7.5L7.5 2.5L12.5 7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 6.5V12.5H6.5V9.5H8.5V12.5H11V6.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  nova: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
    </svg>
  ),
  inbox: (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <path d="M1.5 4.5C1.5 3.95 1.95 3.5 2.5 3.5H12.5C13.05 3.5 13.5 3.95 13.5 4.5V10.5C13.5 11.05 13.05 11.5 12.5 11.5H2.5C1.95 11.5 1.5 11.05 1.5 10.5V4.5Z" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M1.5 5L7.5 8.5L13.5 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  ),
  analytics: (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <path d="M2 12L5.5 8L8.5 10L13 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 13.5H13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  ),
  settings: (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M7.5 1.5v2M7.5 11.5v2M1.5 7.5h2M11.5 7.5h2M3.3 3.3l1.4 1.4M10.3 10.3l1.4 1.4M3.3 11.7l1.4-1.4M10.3 4.7l1.4-1.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  ),
  create: (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 3v9M3 7.5h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  audit: (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <rect x="2" y="2" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M4.5 5.5h6M4.5 8h4M4.5 10.5h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  ),
};

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse>({ results: {} });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global cmd+K / ctrl+K listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults({ results: {} });
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ results: {} });
      setSelected(0);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (r.ok) {
          const data: SearchResponse = await r.json();
          setResults(data);
        }
        setSelected(0);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Build flat list of navigable items for keyboard nav
  const flatItems = useMemo((): { href: string; label: string }[] => {
    if (!query.trim()) {
      return [
        ...NAV_SHORTCUTS.map(n => ({ href: n.href, label: n.label })),
        ...QUICK_ACTIONS.map(a => ({ href: a.href, label: a.label })),
      ];
    }

    const items: { href: string; label: string }[] = [];
    const sections = Object.keys(results.results).sort(
      (a, b) => (SECTION_META[a]?.order ?? 99) - (SECTION_META[b]?.order ?? 99)
    );
    for (const key of sections) {
      for (const item of results.results[key]) {
        items.push({ href: item.href, label: item.title });
      }
    }
    return items;
  }, [query, results]);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${selected}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(i => Math.min(i + 1, flatItems.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(i => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[selected];
      if (item) navigate(item.href);
    }
  }

  const isEmpty = !query.trim();
  const sectionKeys = Object.keys(results.results).sort(
    (a, b) => (SECTION_META[a]?.order ?? 99) - (SECTION_META[b]?.order ?? 99)
  );
  const hasResults = sectionKeys.length > 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[14vh]"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'var(--glass-deep, rgba(16,16,20,0.95))',
          border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--glass-border, rgba(255,255,255,0.07))' }}>
          {loading ? (
            <span
              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
              style={{ borderColor: 'var(--glass-border)', borderTopColor: 'transparent' }}
            />
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0" style={{ color: 'var(--text-3)' }}>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search systems, workflows, tasks..."
            className="flex-1 bg-transparent text-base font-light focus:outline-none"
            style={{ color: 'var(--text-1)' }}
          />
          <kbd
            className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: 'var(--glass, rgba(255,255,255,0.04))', color: 'var(--text-3)', fontFamily: 'inherit' }}
          >
            esc
          </kbd>
        </div>

        {/* Results area */}
        <div ref={listRef} style={{ maxHeight: '420px', overflowY: 'auto' }}>

          {/* Empty state: nav shortcuts + quick actions */}
          {isEmpty && (
            <div className="py-1">
              <p className="text-[10px] tracking-[0.14em] font-light px-5 pt-3 pb-1.5" style={{ color: 'var(--text-3)' }}>
                NAVIGATE
              </p>
              {NAV_SHORTCUTS.map((item, i) => (
                <button
                  key={item.href}
                  data-idx={i}
                  onClick={() => navigate(item.href)}
                  onMouseEnter={() => setSelected(i)}
                  className="w-full flex items-center gap-3 px-5 py-2 text-left transition-colors"
                  style={{
                    background: selected === i ? 'var(--glass, rgba(255,255,255,0.04))' : 'transparent',
                  }}
                >
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--glass, rgba(255,255,255,0.04))', color: 'var(--text-3)' }}
                  >
                    {NAV_ICONS[item.icon] ?? TYPE_ICONS[item.icon] ?? null}
                  </span>
                  <span className="text-sm font-light flex-1" style={{ color: 'var(--text-2)' }}>
                    {item.label}
                  </span>
                  <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
                    {item.hint}
                  </span>
                </button>
              ))}

              <p className="text-[10px] tracking-[0.14em] font-light px-5 pt-4 pb-1.5" style={{ color: 'var(--text-3)' }}>
                QUICK ACTIONS
              </p>
              {QUICK_ACTIONS.map((item, i) => {
                const idx = NAV_SHORTCUTS.length + i;
                return (
                  <button
                    key={item.label}
                    data-idx={idx}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelected(idx)}
                    className="w-full flex items-center gap-3 px-5 py-2 text-left transition-colors"
                    style={{
                      background: selected === idx ? 'var(--glass, rgba(255,255,255,0.04))' : 'transparent',
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: item.icon === 'create' ? 'rgba(200,242,107,0.08)' : 'var(--glass, rgba(255,255,255,0.04))',
                        color: item.icon === 'create' ? '#C8F26B' : 'var(--text-3)',
                      }}
                    >
                      {NAV_ICONS[item.icon] ?? null}
                    </span>
                    <span className="text-sm font-light flex-1" style={{ color: 'var(--text-2)' }}>
                      {item.label}
                    </span>
                    <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
                      {item.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {!isEmpty && !hasResults && !loading && (
            <div className="flex flex-col items-center py-12 gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-3)' }}>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
                No results for &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {/* Loading placeholder (only when no results yet) */}
          {!isEmpty && !hasResults && loading && (
            <div className="flex items-center justify-center py-12">
              <span
                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--glass-border)', borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {/* Search results grouped by type */}
          {!isEmpty && hasResults && (() => {
            let idx = 0;
            return sectionKeys.map((key, si) => {
              const items = results.results[key];
              const meta = SECTION_META[key];
              return (
                <div
                  key={key}
                  className="py-1"
                  style={si > 0 ? { borderTop: '1px solid var(--glass-border, rgba(255,255,255,0.05))' } : undefined}
                >
                  <p
                    className="text-[10px] tracking-[0.14em] font-light px-5 pt-2.5 pb-1"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {meta?.label ?? key.toUpperCase()}
                  </p>
                  {items.map(item => {
                    const i = idx++;
                    return (
                      <button
                        key={item.id}
                        data-idx={i}
                        onClick={() => navigate(item.href)}
                        onMouseEnter={() => setSelected(i)}
                        className="w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors"
                        style={{
                          background: selected === i ? 'var(--glass, rgba(255,255,255,0.04))' : 'transparent',
                        }}
                      >
                        <span
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'var(--glass, rgba(255,255,255,0.04))', color: 'var(--text-3)' }}
                        >
                          {TYPE_ICONS[item.icon] ?? null}
                        </span>
                        <span
                          className="text-sm font-light flex-1 truncate"
                          style={{ color: 'var(--text-1)' }}
                        >
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span className="text-xs font-light flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                            {item.subtitle}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>

        {/* Footer with keyboard hints */}
        <div
          className="flex items-center gap-4 px-5 py-2.5"
          style={{ borderTop: '1px solid var(--glass-border, rgba(255,255,255,0.05))' }}
        >
          {[
            { keys: ['\u2191', '\u2193'], label: 'navigate' },
            { keys: ['\u21B5'], label: 'open' },
            { keys: ['esc'], label: 'close' },
          ].map(({ keys, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              {keys.map(k => (
                <kbd
                  key={k}
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: 'var(--glass, rgba(255,255,255,0.04))',
                    color: 'var(--text-3)',
                    fontFamily: 'inherit',
                    opacity: 0.6,
                  }}
                >
                  {k}
                </kbd>
              ))}
              <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
                {label}
              </span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <kbd
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--glass, rgba(255,255,255,0.04))',
                color: 'var(--text-3)',
                fontFamily: 'inherit',
                opacity: 0.6,
              }}
            >
              {'\u2318'}K
            </kbd>
            <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
              toggle
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
