'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const ALL_EVENTS = [
  { id: 'execution.completed', label: 'Execution completed', color: '#15AD70' },
  { id: 'execution.failed',    label: 'Execution failed',    color: '#FF6B6B' },
  { id: 'automation.run',      label: 'Automation run',      color: '#7193ED' },
  { id: 'alert.critical',      label: 'Alert — critical',    color: '#FF6B6B' },
  { id: 'alert.warning',       label: 'Alert — warning',     color: '#F7C700' },
  { id: 'workflow.activated',  label: 'Workflow activated',  color: '#15AD70' },
  { id: 'workflow.paused',     label: 'Workflow paused',     color: '#F7C700' },
];

type Webhook = {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  totalDeliveries: number;
  lastDelivery: { createdAt: string; success: boolean; status: number | null } | null;
  createdAt: string;
};

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60)   return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400)return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[], secret: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; status: number | null; error?: string }>>({});

  useEffect(() => {
    fetch('/api/webhooks')
      .then(r => r.json())
      .then(d => { setWebhooks(d); setLoaded(true); });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.url || !form.events.length) return;
    setSaving(true);
    setError('');
    const res = await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const refreshed = await fetch('/api/webhooks').then(r => r.json());
      setWebhooks(refreshed);
      setShowCreate(false);
      setForm({ name: '', url: '', events: [], secret: '' });
    } else {
      const d = await res.json();
      setError(d.error ?? 'Failed to create');
    }
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/webhooks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    });
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, isActive: !current } : w));
  }

  async function deleteWebhook(id: string) {
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
    setWebhooks(prev => prev.filter(w => w.id !== id));
  }

  async function testWebhook(id: string) {
    setTesting(id);
    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'POST' });
      const d = await res.json();
      setTestResult(prev => ({ ...prev, [id]: d }));
    } catch {
      setTestResult(prev => ({ ...prev, [id]: { success: false, status: null, error: 'Connection error' } }));
    }
    setTesting(null);
    setTimeout(() => setTestResult(prev => { const n = { ...prev }; delete n[id]; return n; }), 4000);
  }

  function toggleEvent(ev: string) {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }));
  }

  return (
    <div className="px-10 py-10 min-h-screen max-w-3xl">
      <Link href="/settings" className="text-xs font-light mb-8 inline-flex items-center gap-1.5"
        style={{ color: 'var(--text-3)' }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Settings
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">Webhooks</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Receive HTTP callbacks when GRID events fire
          </p>
        </div>
        <button onClick={() => setShowCreate(v => !v)}
          className="text-xs font-light px-3 py-2 rounded-lg transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
          + Add webhook
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-8 p-5 rounded-xl space-y-5"
          style={{ background: 'var(--glass)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-xs tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>NEW WEBHOOK</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Slack alerts"
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>Endpoint URL</label>
              <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://hooks.slack.com/…"
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
            </div>
          </div>

          <div>
            <label className="text-xs mb-2 block" style={{ color: 'var(--text-3)' }}>Events to subscribe</label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map(ev => {
                const on = form.events.includes(ev.id);
                return (
                  <button key={ev.id} type="button" onClick={() => toggleEvent(ev.id)}
                    className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
                    style={{
                      background: on ? `${ev.color}15` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${on ? ev.color + '45' : 'var(--glass-border)'}`,
                      color: on ? ev.color : 'rgba(255,255,255,0.4)',
                    }}>
                    {ev.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>
              Signing secret <span style={{ color: 'rgba(255,255,255,0.2)' }}>(optional)</span>
            </label>
            <input value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
              placeholder="Used to verify HMAC-SHA256 signature"
              className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
          </div>

          {error && <p className="text-xs" style={{ color: '#FF6B6B' }}>{error}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={!form.name || !form.url || !form.events.length || saving}
              className="text-xs font-light px-4 py-2 rounded-lg transition-all disabled:opacity-40"
              style={{ background: 'rgba(21,173,112,0.1)', border: '1px solid rgba(21,173,112,0.25)', color: '#15AD70' }}>
              {saving ? '···' : 'Create webhook'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setError(''); }}
              className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Webhook list */}
      {!loaded ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>No webhooks yet</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Add a webhook to receive notifications in Slack, Discord, or any HTTP endpoint
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(wh => {
            const tr = testResult[wh.id];
            return (
              <div key={wh.id} className="rounded-xl p-5"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Toggle */}
                    <button onClick={() => toggleActive(wh.id, wh.isActive)}
                      className="flex-shrink-0 w-8 h-4.5 rounded-full transition-colors relative"
                      style={{
                        background: wh.isActive ? 'rgba(21,173,112,0.35)' : 'rgba(255,255,255,0.1)',
                        width: 32, height: 18,
                      }}>
                      <span style={{
                        position: 'absolute', top: 2, left: wh.isActive ? 14 : 2,
                        width: 14, height: 14, borderRadius: '50%', transition: 'left 0.15s',
                        background: wh.isActive ? '#15AD70' : 'rgba(255,255,255,0.4)',
                      }} />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-light truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{wh.name}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-3)', fontFamily: 'monospace' }}>{wh.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {tr && (
                      <span className="text-xs px-2 py-0.5 rounded-md"
                        style={{
                          background: tr.success ? 'rgba(21,173,112,0.1)' : 'rgba(255,107,107,0.1)',
                          color: tr.success ? '#15AD70' : '#FF6B6B',
                        }}>
                        {tr.success ? `✓ ${tr.status}` : tr.error ?? `✗ ${tr.status ?? 'err'}`}
                      </span>
                    )}
                    <button onClick={() => testWebhook(wh.id)} disabled={testing === wh.id}
                      className="text-xs font-light px-2.5 py-1 rounded-lg transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}>
                      {testing === wh.id ? '···' : 'Test'}
                    </button>
                    <button onClick={() => deleteWebhook(wh.id)}
                      className="text-xs font-light px-2.5 py-1 rounded-lg transition-all"
                      style={{ color: 'rgba(255,107,107,0.5)' }}>
                      Delete
                    </button>
                  </div>
                </div>

                {/* Events */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {wh.events.map(ev => {
                    const meta = ALL_EVENTS.find(e => e.id === ev);
                    return (
                      <span key={ev} className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: meta ? `${meta.color}10` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${meta ? meta.color + '30' : 'rgba(255,255,255,0.08)'}`,
                          color: meta ? meta.color : 'rgba(255,255,255,0.3)',
                        }}>
                        {meta?.label ?? ev}
                      </span>
                    );
                  })}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  <span>{wh.totalDeliveries} deliveries</span>
                  {wh.lastDelivery && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full"
                          style={{ background: wh.lastDelivery.success ? '#15AD70' : '#FF6B6B' }} />
                        last {timeAgo(wh.lastDelivery.createdAt)}
                        {wh.lastDelivery.status && <span style={{ color: 'rgba(255,255,255,0.15)' }}>· {wh.lastDelivery.status}</span>}
                      </span>
                    </>
                  )}
                  <span>· created {timeAgo(wh.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payload format reference */}
      <div className="mt-8 rounded-xl p-5" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
        <p className="text-xs tracking-[0.1em] mb-3" style={{ color: 'var(--text-3)' }}>PAYLOAD FORMAT</p>
        <pre className="text-xs font-light leading-relaxed overflow-x-auto"
          style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
{`{
  "event": "execution.completed",
  "timestamp": "2026-04-01T12:00:00.000Z",
  "data": {
    "executionId": "...",
    "systemId": "...",
    "workflowId": "...",
    "tokens": 1842
  }
}`}
        </pre>
        <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Signed requests include <code style={{ fontFamily: 'monospace' }}>X-GRID-Signature: sha256=…</code> header
        </p>
      </div>
    </div>
  );
}
