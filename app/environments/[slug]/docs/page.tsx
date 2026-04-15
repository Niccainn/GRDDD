'use client';

import { useEffect, useState, useCallback } from 'react';
import { useEnvironmentWorkspace } from '@/lib/contexts/environment-workspace';

type Doc = {
  id: string;
  title: string;
  content: string | null;
  parentId: string | null;
  children?: Doc[];
  updatedAt: string;
  createdAt: string;
  systemName: string | null;
  systemColor: string | null;
};

export default function EnvironmentDocs() {
  const { environmentId } = useEnvironmentWorkspace();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Doc | null>(null);

  const load = useCallback(() => {
    fetch(`/api/docs?envId=${environmentId}`)
      .then(r => r.json())
      .then(d => { setDocs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [environmentId]);

  useEffect(() => { load(); }, [load]);

  // Build tree from flat list
  function buildTree(items: Doc[]): Doc[] {
    const map = new Map<string, Doc>();
    const roots: Doc[] = [];
    for (const doc of items) {
      map.set(doc.id, { ...doc, children: [] });
    }
    for (const doc of items) {
      const node = map.get(doc.id)!;
      if (doc.parentId && map.has(doc.parentId)) {
        map.get(doc.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  const filtered = docs.filter(d =>
    !search || d.title.toLowerCase().includes(search.toLowerCase())
  );
  const tree = buildTree(filtered);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  async function createDoc() {
    const res = await fetch('/api/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled', environmentId, content: '' }),
    });
    if (res.ok) {
      const doc = await res.json();
      setDocs(prev => [doc, ...prev]);
      setSelected(doc);
    }
  }

  function DocNode({ doc, depth = 0 }: { doc: Doc; depth?: number }) {
    const hasChildren = doc.children && doc.children.length > 0;
    const isExpanded = expanded.has(doc.id);
    const isSelected = selected?.id === doc.id;

    return (
      <div>
        <button
          onClick={() => { setSelected(doc); if (hasChildren) toggleExpand(doc.id); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all group"
          style={{
            paddingLeft: `${12 + depth * 16}px`,
            background: isSelected ? 'var(--glass-active)' : 'transparent',
            color: isSelected ? 'var(--text-1)' : 'var(--text-2)',
          }}
        >
          {hasChildren ? (
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              className="flex-shrink-0 transition-transform"
              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', color: 'var(--text-3)' }}
            >
              <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 15 15" fill="none" className="flex-shrink-0" style={{ color: 'var(--text-3)' }}>
              <path d="M4 1.5H9.5L12 4V13C12 13.28 11.78 13.5 11.5 13.5H4C3.72 13.5 3.5 13.28 3.5 13V2C3.5 1.72 3.72 1.5 4 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
            </svg>
          )}
          <span className="text-xs font-light truncate flex-1">{doc.title}</span>
          <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-3)' }}>
            {timeAgo(doc.updatedAt)}
          </span>
        </button>
        {hasChildren && isExpanded && (
          <div>
            {doc.children!.map(child => (
              <DocNode key={child.id} doc={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--glass)' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4" style={{ minHeight: '60vh' }}>
      {/* Sidebar */}
      <div
        className="w-64 flex-shrink-0 rounded-xl p-3"
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
        }}
      >
        {/* Search */}
        <div className="relative mb-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search docs..."
            className="w-full text-xs font-light pl-7 pr-3 py-1.5 rounded-lg focus:outline-none transition-all"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-1)',
            }}
          />
          <svg width="12" height="12" viewBox="0 0 15 15" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>

        {/* New doc button */}
        <button
          onClick={createDoc}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-light mb-3 transition-all"
          style={{
            background: 'var(--brand-soft)',
            border: '1px solid var(--brand-border)',
            color: 'var(--brand)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          New document
        </button>

        {/* Tree */}
        <div className="space-y-0.5">
          {tree.length === 0 ? (
            <p className="text-xs py-4 text-center" style={{ color: 'var(--text-3)' }}>No documents</p>
          ) : (
            tree.map(doc => <DocNode key={doc.id} doc={doc} />)
          )}
        </div>
      </div>

      {/* Content area */}
      <div
        className="flex-1 rounded-xl p-6"
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
        }}
      >
        {selected ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              {selected.systemName && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: selected.systemColor ?? 'var(--text-3)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{selected.systemName}</span>
                </span>
              )}
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>{timeAgo(selected.updatedAt)}</span>
            </div>
            <h2 className="text-lg font-extralight tracking-tight mb-4" style={{ color: 'var(--text-1)' }}>
              {selected.title}
            </h2>
            <div className="text-sm font-light leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>
              {selected.content || (
                <span style={{ color: 'var(--text-3)' }}>This document is empty.</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg width="24" height="24" viewBox="0 0 15 15" fill="none" className="mx-auto mb-3" style={{ color: 'var(--text-3)' }}>
                <path d="M4 1.5H9.5L12 4V13C12 13.28 11.78 13.5 11.5 13.5H4C3.72 13.5 3.5 13.28 3.5 13V2C3.5 1.72 3.72 1.5 4 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
                <path d="M9.5 1.5V4H12" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
              </svg>
              <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Select a document to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
