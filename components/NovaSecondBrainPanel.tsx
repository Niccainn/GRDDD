'use client';

import { useEffect, useState, useCallback } from 'react';

type Memory = {
  id: string;
  type: string;
  category: string | null;
  title: string;
  content: string;
  source: string | null;
  confidence: number;
  environmentId: string | null;
  systemId: string | null;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  brand_context: 'Brand',
  market_insight: 'Market',
  user_correction: 'Corrections',
  strategic_context: 'Strategy',
  learned_preference: 'Preferences',
  pattern: 'Patterns',
};

const TYPE_KEYS = Object.keys(TYPE_LABELS);

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function confidenceColor(c: number) {
  if (c >= 0.8) return '#15AD70';
  if (c >= 0.5) return '#E5A913';
  return '#E54B4B';
}

export default function NovaSecondBrainPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('brand_context');
  const [saving, setSaving] = useState(false);

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (activeTab) params.set('type', activeTab);
      const res = await fetch(`/api/nova/memory?${params}`);
      const data = await res.json();
      setMemories(data.memories ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [search, activeTab]);

  useEffect(() => {
    if (open) fetchMemories();
  }, [open, fetchMemories]);

  async function handleDelete(id: string) {
    await fetch(`/api/nova/memory/${id}`, { method: 'DELETE' });
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/nova/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          type: newType,
          source: 'user_input',
        }),
      });
      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        setShowAdd(false);
        fetchMemories();
      }
    } finally {
      setSaving(false);
    }
  }

  const filtered = memories;
  const total = memories.length;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
            transition: 'opacity 0.2s',
          }}
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '480px',
          maxWidth: '100vw',
          zIndex: 100,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'rgba(14, 16, 20, 0.95)',
          backdropFilter: 'blur(40px)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #BF9FF1 0%, #7193ED 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 21h6" strokeLinecap="round" />
                  <path d="M10 17v4" strokeLinecap="round" />
                  <path d="M14 17v4" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 200,
                    color: 'rgba(255,255,255,0.9)',
                    letterSpacing: '-0.01em',
                    margin: 0,
                  }}
                >
                  Nova Second Brain
                </h2>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                  {total} {total === 1 ? 'memory' : 'memories'} stored
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                lineHeight: 1,
              }}
            >
              x
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <svg
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
              <circle cx="5" cy="5" r="3.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
              <path d="M8 8l2.5 2.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories..."
              style={{
                width: '100%',
                fontSize: '13px',
                fontWeight: 300,
                padding: '8px 12px 8px 30px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                color: 'white',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab(null)}
              style={{
                fontSize: '11px',
                fontWeight: 300,
                padding: '4px 10px',
                borderRadius: '20px',
                border: `1px solid ${!activeTab ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
                background: !activeTab ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: !activeTab ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
              }}
            >
              All
            </button>
            {TYPE_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(activeTab === key ? null : key)}
                style={{
                  fontSize: '11px',
                  fontWeight: 300,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  border: `1px solid ${activeTab === key ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
                  background: activeTab === key ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: activeTab === key ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                }}
              >
                {TYPE_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        {/* Add memory toggle */}
        <div style={{ padding: '12px 24px 0', flexShrink: 0 }}>
          {!showAdd ? (
            <button
              onClick={() => setShowAdd(true)}
              style={{
                width: '100%',
                fontSize: '12px',
                fontWeight: 300,
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px dashed rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.02)',
                color: 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              + Add a memory
            </button>
          ) : (
            <form
              onSubmit={handleAdd}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid rgba(191,159,241,0.15)',
                background: 'rgba(191,159,241,0.04)',
              }}
            >
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Memory title"
                autoFocus
                style={{
                  width: '100%',
                  fontSize: '13px',
                  fontWeight: 300,
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'white',
                  outline: 'none',
                  marginBottom: '8px',
                  boxSizing: 'border-box',
                }}
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="What should Nova remember?"
                rows={3}
                style={{
                  width: '100%',
                  fontSize: '13px',
                  fontWeight: 300,
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'white',
                  outline: 'none',
                  resize: 'none',
                  marginBottom: '8px',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: '12px',
                    fontWeight: 300,
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.7)',
                    outline: 'none',
                  }}
                >
                  {TYPE_KEYS.map((k) => (
                    <option key={k} value={k} style={{ background: '#1a1c22' }}>
                      {TYPE_LABELS[k]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  style={{
                    fontSize: '12px',
                    fontWeight: 300,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newTitle.trim() || !newContent.trim()}
                  style={{
                    fontSize: '12px',
                    fontWeight: 300,
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #BF9FF1, #7193ED)',
                    color: 'white',
                    cursor: saving ? 'wait' : 'pointer',
                    opacity: saving || !newTitle.trim() || !newContent.trim() ? 0.4 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Memory list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    height: '80px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                borderRadius: '12px',
                border: '1px dashed rgba(255,255,255,0.06)',
                marginTop: '8px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(191,159,241,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(191,159,241,0.4)" strokeWidth="1.5">
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p style={{ fontSize: '13px', fontWeight: 300, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px', lineHeight: 1.5 }}>
                Nova hasn&apos;t stored any memories yet.
              </p>
              <p style={{ fontSize: '12px', fontWeight: 300, color: 'rgba(255,255,255,0.2)', margin: 0, lineHeight: 1.5 }}>
                As you work, Nova will learn your brand voice, preferences, and patterns.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              {filtered.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(12px)',
                    position: 'relative',
                  }}
                >
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(m.id)}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(229,75,75,0.7)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.15)')}
                  >
                    x
                  </button>

                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', paddingRight: '20px' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: confidenceColor(m.confidence),
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 300,
                        color: 'rgba(255,255,255,0.85)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.title}
                    </span>
                  </div>

                  {/* Content preview */}
                  <p
                    style={{
                      fontSize: '12px',
                      fontWeight: 300,
                      color: 'rgba(255,255,255,0.4)',
                      margin: '0 0 8px',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {m.content}
                  </p>

                  {/* Meta row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 300,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: 'rgba(191,159,241,0.08)',
                        color: 'rgba(191,159,241,0.6)',
                      }}
                    >
                      {TYPE_LABELS[m.type] ?? m.type}
                    </span>
                    {m.category && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 300,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: 'rgba(21,173,112,0.08)',
                          color: 'rgba(21,173,112,0.6)',
                        }}
                      >
                        {m.category}
                      </span>
                    )}
                    <span style={{ fontSize: '10px', fontWeight: 300, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>
                      {timeAgo(m.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
