'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchArray } from '@/lib/api/safe-fetch';

type DocItem = {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  environmentId: string;
  updatedAt: string;
  environment: { id: string; name: string; slug: string; color: string | null };
};

type EnvOption = { id: string; name: string; slug: string; color: string | null };

type TreeNode = DocItem & { children: TreeNode[]; depth: number };

function buildTree(docs: DocItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const d of docs) {
    map.set(d.id, { ...d, children: [], depth: 0 });
  }

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      const parent = map.get(node.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  function walk(list: TreeNode[]) {
    for (const n of list) {
      result.push(n);
      walk(n.children);
    }
  }
  walk(nodes);
  return result;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function DocsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [environments, setEnvironments] = useState<EnvOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [envFilter, setEnvFilter] = useState('');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (envFilter) params.set('envId', envFilter);
    if (search) params.set('q', search);
    fetch(`/api/docs?${params}`)
      .then(r => r.json())
      .then(d => { setDocs(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [envFilter, search]);

  useEffect(() => {
    load();
    fetchArray<EnvOption>('/api/environments').then(setEnvironments);
  }, [load]);

  const createDoc = async (parentId?: string) => {
    const targetEnv = envFilter || environments[0]?.id;
    if (!targetEnv) return;
    const res = await fetch('/api/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environmentId: targetEnv, parentId }),
    });
    if (res.ok) {
      const doc = await res.json();
      router.push(`/docs/${doc.id}`);
    }
  };

  const deleteDoc = async (id: string) => {
    const ok = typeof window !== 'undefined'
      ? window.confirm('Delete this document permanently? This cannot be undone.')
      : true;
    if (!ok) return;
    await fetch(`/api/docs/${id}`, { method: 'DELETE' });
    setMenuOpen(null);
    // Optimistic local removal so the row disappears immediately, then
    // reload to pick up any server-side side effects.
    setDocs(prev => prev.filter(d => d.id !== id));
    load();
  };

  const renameDoc = async (id: string) => {
    await fetch(`/api/docs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: renameValue }),
    });
    setRenaming(null);
    load();
  };

  const tree = buildTree(docs);
  const flat = flattenTree(tree);

  // Filter out children of collapsed parents
  const visible = flat.filter(node => {
    let current = node.parentId;
    while (current) {
      if (collapsed.has(current)) return false;
      const parent = docs.find(d => d.id === current);
      current = parent?.parentId || null;
    }
    return true;
  });

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-light tracking-wide" style={{ color: 'var(--text-1)' }}>
            Documents
          </h1>
          <p className="text-sm font-light mt-1" style={{ color: 'var(--text-3)' }}>
            {docs.length} document{docs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => createDoc()}
          className="px-4 py-2 rounded-xl text-sm font-light transition-all"
          style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-1)',
          }}
        >
          + New document
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }}>
            <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2" />
            <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-light"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-1)',
              outline: 'none',
            }}
          />
        </div>
        <select
          value={envFilter}
          onChange={e => setEnvFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm font-light appearance-none cursor-pointer"
          style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-2)',
            outline: 'none',
            minWidth: 160,
          }}
        >
          <option value="">All environments</option>
          {environments.map(env => (
            <option key={env.id} value={env.id}>{env.name}</option>
          ))}
        </select>
      </div>

      {/* Document list */}
      {!loaded ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--glass-border)', borderTopColor: 'transparent' }} />
        </div>
      ) : visible.length === 0 ? (
        /* Empty state */
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--glass-deep)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-3)' }}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="14,2 14,8 20,8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" />
              <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" />
              <line x1="10" y1="9" x2="8" y2="9" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-lg font-light mb-2" style={{ color: 'var(--text-1)' }}>
            Create your first document
          </h3>
          <p className="text-sm font-light mb-6" style={{ color: 'var(--text-3)' }}>
            Write notes, specs, briefs, and more inside your environments.
          </p>
          <button
            onClick={() => createDoc()}
            className="px-6 py-2.5 rounded-xl text-sm font-light transition-all"
            style={{
              background: 'var(--glass-deep)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-1)',
            }}
          >
            + New document
          </button>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          {visible.map((node, i) => {
            const hasChildren = node.children.length > 0;
            const isCollapsed = collapsed.has(node.id);

            return (
              <div
                key={node.id}
                className="group flex items-center gap-3 px-4 py-3 transition-all cursor-pointer relative"
                style={{
                  paddingLeft: `${16 + node.depth * 24}px`,
                  borderBottom: i < visible.length - 1 ? '1px solid var(--glass-border)' : 'none',
                  background: menuOpen === node.id ? 'var(--glass-deep)' : 'transparent',
                }}
                onClick={() => {
                  if (renaming === node.id) return;
                  router.push(`/docs/${node.id}`);
                }}
              >
                {/* Collapse toggle */}
                <button
                  onClick={e => { e.stopPropagation(); toggleCollapse(node.id); }}
                  className="w-5 h-5 flex items-center justify-center rounded transition-all flex-shrink-0"
                  style={{
                    color: 'var(--text-3)',
                    opacity: hasChildren ? 1 : 0,
                    pointerEvents: hasChildren ? 'auto' : 'none',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                    <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Icon — brand-colored circle keyed to the document's environment */}
                <span
                  className="flex-shrink-0 rounded-full"
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    background: node.environment.color || 'var(--brand)',
                    boxShadow: node.environment.color
                      ? `0 0 0 2px ${node.environment.color}20`
                      : '0 0 0 2px rgba(200,242,107,0.12)',
                    marginLeft: 4,
                    marginRight: 4,
                  }}
                />

                {/* Title */}
                {renaming === node.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => renameDoc(node.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') renameDoc(node.id);
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 bg-transparent text-sm font-light outline-none"
                    style={{ color: 'var(--text-1)', borderBottom: '1px solid var(--glass-border)' }}
                  />
                ) : (
                  <span className="flex-1 text-sm font-light truncate" style={{ color: 'var(--text-1)' }}>
                    {node.title}
                  </span>
                )}

                {/* Environment badge */}
                <span
                  className="text-xs font-light px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline"
                  style={{
                    background: node.environment.color ? `${node.environment.color}15` : 'var(--glass-deep)',
                    color: node.environment.color || 'var(--text-3)',
                    border: `1px solid ${node.environment.color ? `${node.environment.color}30` : 'var(--glass-border)'}`,
                  }}
                >
                  {node.environment.name}
                </span>

                {/* Updated */}
                <span className="text-xs font-light flex-shrink-0 hidden md:inline" style={{ color: 'var(--text-3)' }}>
                  {timeAgo(node.updatedAt)}
                </span>

                {/* Menu */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === node.id ? null : node.id); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-3)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <circle cx="7" cy="3" r="1" />
                      <circle cx="7" cy="7" r="1" />
                      <circle cx="7" cy="11" r="1" />
                    </svg>
                  </button>
                  {menuOpen === node.id && (
                    <div
                      className="absolute right-0 top-8 z-50 rounded-xl py-1 min-w-[140px]"
                      style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(40px)' }}
                    >
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setRenaming(node.id);
                          setRenameValue(node.title);
                          setMenuOpen(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm font-light transition-colors"
                        style={{ color: 'var(--text-2)' }}
                      >
                        Rename
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          createDoc(node.id);
                          setMenuOpen(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm font-light transition-colors"
                        style={{ color: 'var(--text-2)' }}
                      >
                        Add sub-page
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deleteDoc(node.id);
                        }}
                        className="w-full text-left px-4 py-2 text-sm font-light transition-colors"
                        style={{ color: '#FF6B6B' }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Click-away handler for menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  );
}
