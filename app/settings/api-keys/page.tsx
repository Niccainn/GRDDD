'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SettingsNav from '@/components/SettingsNav';

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  lastUsed: string | null;
  expiresAt: string | null;
  createdAt: string;
};

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60)   return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400)return `${Math.floor(d / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const EXPIRY_OPTIONS = [
  { label: 'No expiry', value: '' },
  { label: '30 days',   value: '30' },
  { label: '90 days',   value: '90' },
  { label: '1 year',    value: '365' },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/keys').then(r => r.json()).then(d => { setKeys(d); setLoaded(true); });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), expiresInDays: expiry ? parseInt(expiry) : null }),
    });
    if (res.ok) {
      const { key } = await res.json();
      setNewKey(key);
      setName('');
      setExpiry('');
      setShowCreate(false);
      const refreshed = await fetch('/api/keys').then(r => r.json());
      setKeys(refreshed);
    }
    setCreating(false);
  }

  async function toggleKey(id: string, current: boolean) {
    await fetch(`/api/keys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    });
    setKeys(prev => prev.map(k => k.id === id ? { ...k, isActive: !current } : k));
  }

  async function deleteKey(id: string) {
    await fetch(`/api/keys/${id}`, { method: 'DELETE' });
    setKeys(prev => prev.filter(k => k.id !== id));
  }

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen max-w-3xl">
      <SettingsNav />
      <Link href="/settings" className="text-xs font-light mb-8 inline-flex items-center gap-1.5"
        style={{ color: 'var(--text-3)' }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Settings
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">API Keys</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Authenticate external requests to the GRID public API
          </p>
        </div>
        <button onClick={() => setShowCreate(v => !v)}
          className="text-xs font-light px-3 py-2 rounded-lg transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
          + New key
        </button>
      </div>

      {/* New key banner */}
      {newKey && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(200,242,107,0.08)', border: '1px solid rgba(200,242,107,0.25)' }}>
          <p className="text-xs mb-2" style={{ color: '#C8F26B' }}>
            ✓ Key created — copy it now, it won&apos;t be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs px-3 py-2 rounded-lg font-mono overflow-x-auto"
              style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.7)', display: 'block' }}>
              {newKey}
            </code>
            <button onClick={copyKey}
              className="flex-shrink-0 text-xs px-3 py-2 rounded-lg transition-all"
              style={{ background: copied ? 'rgba(200,242,107,0.1)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: copied ? '#C8F26B' : 'rgba(255,255,255,0.5)' }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button onClick={() => setNewKey(null)} className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>✕</button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 p-5 rounded-xl space-y-4"
          style={{ background: 'var(--glass)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-xs tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>NEW API KEY</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Key name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Zapier integration"
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Expiry</label>
              <select value={expiry} onChange={e => setExpiry(e.target.value)}
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.6)' }}>
                {EXPIRY_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: '#111' }}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={!name.trim() || creating}
              className="text-xs font-light px-4 py-2 rounded-lg transition-all disabled:opacity-40"
              style={{ background: 'rgba(200,242,107,0.1)', border: '1px solid rgba(200,242,107,0.25)', color: '#C8F26B' }}>
              {creating ? '···' : 'Generate key'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Key list */}
      {!loaded ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>No API keys yet</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Generate a key to trigger workflows from external tools</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="flex items-center gap-4 px-4 py-3.5 rounded-xl"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              <button onClick={() => toggleKey(k.id, k.isActive)}
                className="flex-shrink-0 rounded-full transition-colors relative"
                style={{ width: 32, height: 18, background: k.isActive ? 'rgba(200,242,107,0.35)' : 'rgba(255,255,255,0.1)' }}>
                <span style={{
                  position: 'absolute', top: 2, left: k.isActive ? 14 : 2,
                  width: 14, height: 14, borderRadius: '50%', transition: 'left 0.15s',
                  background: k.isActive ? '#C8F26B' : 'rgba(255,255,255,0.4)',
                }} />
              </button>

              <code className="text-xs font-mono flex-shrink-0"
                style={{ color: k.isActive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)' }}>
                {k.prefix}···
              </code>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-light" style={{ color: k.isActive ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)' }}>
                  {k.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Created {timeAgo(k.createdAt)}
                  {k.lastUsed && ` · Last used ${timeAgo(k.lastUsed)}`}
                  {k.expiresAt && ` · Expires ${new Date(k.expiresAt).toLocaleDateString()}`}
                </p>
              </div>

              <button onClick={() => deleteKey(k.id)}
                className="text-xs font-light flex-shrink-0 transition-colors"
                style={{ color: 'rgba(255,107,107,0.4)' }}>
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Usage reference */}
      <div className="mt-8 rounded-xl p-5" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
        <p className="text-xs tracking-[0.1em] mb-3" style={{ color: 'var(--text-3)' }}>USAGE</p>
        <pre className="text-xs font-light leading-relaxed overflow-x-auto"
          style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
{`curl -X POST https://grddd.com/api/v1/run \\
  -H "Authorization: Bearer grd_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflowId": "clm...",
    "input": "Publish the weekly report"
  }'`}
        </pre>
        <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Returns <code style={{ fontFamily: 'monospace' }}>&#123; executionId, status: &quot;queued&quot; &#125;</code>
        </p>
      </div>
    </div>
  );
}
