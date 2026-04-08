'use client';

import { useState, useEffect } from 'react';

type MemoryData = {
  memory: string | null;
  updatedAt: string | null;
};

export default function NovaMemoryPanel({ systemId }: { systemId: string }) {
  const [data, setData] = useState<MemoryData>({ memory: null, updatedAt: null });
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/nova/memory?systemId=${systemId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoaded(true); });
  }, [systemId, open]);

  function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  async function handleSave() {
    if (!draft.trim()) return;
    setSaving(true);
    const res = await fetch('/api/nova/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemId, memory: draft.trim() }),
    });
    const updated = await res.json();
    setData({ memory: updated.memory, updatedAt: updated.updatedAt });
    setEditing(false);
    setSaving(false);
  }

  async function handleClear() {
    setClearing(true);
    await fetch('/api/nova/memory', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemId }),
    });
    setData({ memory: null, updatedAt: null });
    setClearing(false);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ background: 'var(--glass)' }}
      >
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ color: '#BF9FF1', opacity: 0.8 }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          <span className="text-xs tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>NOVA MEMORY</span>
          {data.memory && (
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#BF9FF1', opacity: 0.6 }} />
          )}
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ color: 'var(--text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2" style={{ background: 'rgba(191,159,241,0.02)', borderTop: '1px solid var(--glass-border)' }}>
          {!loaded ? (
            <div className="h-12 rounded-lg animate-pulse mt-2" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ) : !data.memory && !editing ? (
            <div className="py-4 text-center">
              <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>
                No memory yet — Nova will build it as you interact
              </p>
              <button
                onClick={() => { setDraft(''); setEditing(true); }}
                className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(191,159,241,0.08)', border: '1px solid rgba(191,159,241,0.2)', color: '#BF9FF1' }}>
                + Add context manually
              </button>
            </div>
          ) : editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={6}
                placeholder="Write context that Nova should know about this system — goals, priorities, constraints, patterns, decisions made..."
                className="w-full text-xs font-light px-3 py-2.5 rounded-lg focus:outline-none resize-none leading-relaxed"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(191,159,241,0.2)',
                  color: 'rgba(255,255,255,0.7)',
                }}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={!draft.trim() || saving}
                  className="text-xs font-light px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                  style={{ background: 'rgba(191,159,241,0.1)', border: '1px solid rgba(191,159,241,0.25)', color: '#BF9FF1' }}>
                  {saving ? '···' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs font-light"
                  style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <div className="text-xs font-light leading-relaxed whitespace-pre-wrap mb-3"
                style={{ color: 'rgba(255,255,255,0.6)' }}>
                {data.memory}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {data.updatedAt ? `Updated ${timeAgo(data.updatedAt)}` : ''}
                </span>
                <button
                  onClick={() => { setDraft(data.memory ?? ''); setEditing(true); }}
                  className="text-xs font-light ml-auto transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Edit
                </button>
                <button
                  onClick={handleClear}
                  disabled={clearing}
                  className="text-xs font-light transition-colors"
                  style={{ color: 'rgba(255,107,107,0.45)' }}>
                  {clearing ? '···' : 'Clear'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
