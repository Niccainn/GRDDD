'use client';

import { useState, useEffect } from 'react';

type Doc = {
  id: string;
  title: string;
  summary: string;
  body: string;
  isActive: boolean;
  updatedAt: string;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function SystemContextDocs({ systemId }: { systemId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', body: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/systems/${systemId}/context`)
      .then(r => r.json())
      .then(d => { setDocs(d); setLoaded(true); });
  }, [systemId, open]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/systems/${systemId}/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const doc = await res.json();
    setDocs(prev => [doc, ...prev]);
    setForm({ title: '', body: '' });
    setCreating(false);
    setSaving(false);
  }

  async function handleEdit(docId: string) {
    setSaving(true);
    const res = await fetch(`/api/systems/${systemId}/context/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    const updated = await res.json();
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, ...updated } : d));
    setEditing(null);
    setSaving(false);
  }

  async function handleDelete(docId: string) {
    await fetch(`/api/systems/${systemId}/context/${docId}`, { method: 'DELETE' });
    setDocs(prev => prev.filter(d => d.id !== docId));
    if (expandedId === docId) setExpandedId(null);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ background: 'var(--glass)' }}
      >
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ color: '#7193ED', opacity: 0.8 }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span className="text-xs tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>CONTEXT DOCS</span>
          {docs.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(113,147,237,0.1)', color: '#7193ED', border: '1px solid rgba(113,147,237,0.2)' }}>
              {docs.length}
            </span>
          )}
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ color: 'var(--text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2" style={{ background: 'rgba(113,147,237,0.02)', borderTop: '1px solid var(--glass-border)' }}>
          {!loaded ? (
            <div className="h-10 rounded-lg animate-pulse mt-2" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ) : (
            <>
              {/* Doc list */}
              {docs.length > 0 && (
                <div className="mt-2 space-y-1.5 mb-3">
                  {docs.map(doc => (
                    <div key={doc.id} className="rounded-lg overflow-hidden"
                      style={{ border: '1px solid rgba(113,147,237,0.12)' }}>
                      <button
                        onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors"
                        style={{ background: 'rgba(113,147,237,0.04)' }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-light truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                            {doc.title}
                          </span>
                          <span className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            {timeAgo(doc.updatedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <button
                            onClick={e => { e.stopPropagation(); setEditing(doc.id); setEditForm({ title: doc.title, body: doc.body }); setExpandedId(null); }}
                            className="text-xs font-light transition-colors"
                            style={{ color: 'rgba(255,255,255,0.2)' }}>
                            Edit
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(doc.id); }}
                            className="text-xs font-light transition-colors"
                            style={{ color: 'rgba(255,107,107,0.35)' }}>
                            ✕
                          </button>
                        </div>
                      </button>

                      {editing === doc.id ? (
                        <div className="px-3 py-2.5 space-y-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <input
                            value={editForm.title}
                            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                            className="w-full text-xs font-light px-2.5 py-1.5 rounded-lg focus:outline-none"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(113,147,237,0.2)', color: 'white' }}
                          />
                          <textarea
                            value={editForm.body}
                            onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))}
                            rows={5}
                            className="w-full text-xs font-light px-2.5 py-2 rounded-lg focus:outline-none resize-none leading-relaxed"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(113,147,237,0.2)', color: 'rgba(255,255,255,0.65)' }}
                          />
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEdit(doc.id)} disabled={saving}
                              className="text-xs font-light px-3 py-1 rounded-lg transition-all"
                              style={{ background: 'rgba(113,147,237,0.1)', border: '1px solid rgba(113,147,237,0.25)', color: '#7193ED' }}>
                              {saving ? '···' : 'Save'}
                            </button>
                            <button onClick={() => setEditing(null)}
                              className="text-xs font-light"
                              style={{ color: 'rgba(255,255,255,0.25)' }}>Cancel</button>
                          </div>
                        </div>
                      ) : expandedId === doc.id && doc.body ? (
                        <div className="px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.01)' }}>
                          <p className="text-xs font-light leading-relaxed whitespace-pre-wrap"
                            style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {doc.body}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {/* Create form */}
              {creating ? (
                <form onSubmit={handleCreate} className="mt-2 space-y-2">
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Document title (e.g. Brand Guidelines, Team Structure)"
                    className="w-full text-xs font-light px-3 py-2 rounded-lg focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(113,147,237,0.2)', color: 'white' }}
                    autoFocus
                  />
                  <textarea
                    value={form.body}
                    onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="Write the context content Nova should know about this system..."
                    rows={5}
                    className="w-full text-xs font-light px-3 py-2 rounded-lg focus:outline-none resize-none leading-relaxed"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(113,147,237,0.2)', color: 'rgba(255,255,255,0.65)' }}
                  />
                  <div className="flex items-center gap-2">
                    <button type="submit" disabled={!form.title.trim() || saving}
                      className="text-xs font-light px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                      style={{ background: 'rgba(113,147,237,0.1)', border: '1px solid rgba(113,147,237,0.25)', color: '#7193ED' }}>
                      {saving ? '···' : 'Add document'}
                    </button>
                    <button type="button" onClick={() => { setCreating(false); setForm({ title: '', body: '' }); }}
                      className="text-xs font-light"
                      style={{ color: 'rgba(255,255,255,0.25)' }}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="mt-2 w-full text-xs font-light px-3 py-2 rounded-lg transition-all text-left"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(113,147,237,0.2)',
                    color: 'rgba(113,147,237,0.5)',
                  }}>
                  + Add context document
                </button>
              )}

              {docs.length === 0 && !creating && (
                <p className="text-xs text-center mt-2 mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Context docs are automatically included in every Nova conversation for this system
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
