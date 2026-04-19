'use client';

/**
 * BYOK settings — connect an Anthropic API key per environment.
 *
 * Nova always runs on the environment owner's Anthropic account in
 * byok/live tiers. This page is the one place a user pastes their key,
 * sees the masked preview, and disconnects/rotates. We validate against
 * the live Anthropic API on save so the user gets an immediate "key
 * rejected" error verbatim (invalid format vs credit balance low vs
 * revoked) instead of discovering the problem mid-Nova-run.
 *
 * The plaintext key is never persisted to component state longer than
 * a single submit — we clear the field immediately after POST, and the
 * GET response only returns the masked preview ("sk-ant-...a7f3").
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SettingsNav from '@/components/SettingsNav';

type Environment = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
};

type KeyStatus = {
  environmentId: string;
  environmentName: string;
  connected: boolean;
  preview: string | null;
  addedAt: string | null;
  source: string | null;
};

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AiSettingsPage() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [rawKey, setRawKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load environments owned by the signed-in user on mount.
  useEffect(() => {
    fetch('/api/environments')
      .then((r) => r.json())
      .then((envs: Environment[]) => {
        setEnvironments(envs);
        if (envs.length > 0) setActiveEnvId(envs[0].id);
        setLoaded(true);
      });
  }, []);

  // Whenever the active environment changes, fetch its key status.
  useEffect(() => {
    if (!activeEnvId) return;
    setStatus(null);
    setError(null);
    setSuccess(null);
    fetch(`/api/settings/anthropic-key?environmentId=${activeEnvId}`)
      .then((r) => r.json())
      .then((s: KeyStatus) => setStatus(s));
  }, [activeEnvId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!activeEnvId || !rawKey.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/settings/anthropic-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environmentId: activeEnvId, apiKey: rawKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save key');
      } else {
        setSuccess('Connected — Nova is now running on your Anthropic account.');
        // Refetch full status so preview/addedAt render.
        const refreshed = await fetch(
          `/api/settings/anthropic-key?environmentId=${activeEnvId}`,
        ).then((r) => r.json());
        setStatus(refreshed);
        // Critical: scrub the plaintext out of component state ASAP.
        setRawKey('');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!activeEnvId || !status?.connected) return;
    if (
      !confirm(
        'Disconnect this Anthropic key? Nova will stop running for this environment until a new key is connected.',
      )
    )
      return;
    setSaving(true);
    await fetch(`/api/settings/anthropic-key?environmentId=${activeEnvId}`, {
      method: 'DELETE',
    });
    const refreshed = await fetch(
      `/api/settings/anthropic-key?environmentId=${activeEnvId}`,
    ).then((r) => r.json());
    setStatus(refreshed);
    setSuccess(null);
    setError(null);
    setSaving(false);
  }

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen max-w-3xl">
      <SettingsNav />
      <Link
        href="/settings"
        className="text-xs font-light mb-8 inline-flex items-center gap-1.5"
        style={{ color: 'var(--text-3)' }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M6 2L3 5l3 3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Settings
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-extralight tracking-tight mb-1">AI · Anthropic</h1>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          Connect your Anthropic account so Nova runs on your own key. Usage is billed directly by
          Anthropic — GRID never sees a cent of it.
        </p>
      </div>

      {/* Environment picker — only shown when >1 env exists */}
      {loaded && environments.length > 1 && (
        <div className="mb-6">
          <label className="text-xs mb-2 block tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
            ENVIRONMENT
          </label>
          <div className="flex flex-wrap gap-2">
            {environments.map((env) => (
              <button
                key={env.id}
                type="button"
                onClick={() => setActiveEnvId(env.id)}
                className="text-xs font-light px-3 py-2 rounded-lg transition-all"
                style={{
                  background:
                    activeEnvId === env.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${
                    activeEnvId === env.id ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'
                  }`,
                  color:
                    activeEnvId === env.id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-2"
                  style={{ background: env.color ?? '#888' }}
                />
                {env.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current status card */}
      {status && (
        <div
          className="mb-6 p-5 rounded-xl"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs tracking-[0.1em] mb-2" style={{ color: 'var(--text-3)' }}>
                CURRENT KEY
              </p>
              {status.connected ? (
                <>
                  <code
                    className="text-sm font-mono px-3 py-1.5 rounded-lg inline-block"
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {status.preview}
                  </code>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
                    Connected {status.addedAt ? timeAgo(status.addedAt) : ''} · source:{' '}
                    {status.source}
                  </p>
                </>
              ) : (
                <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  No Anthropic key connected. Nova will not run until you connect one.
                </p>
              )}
            </div>
            {status.connected && (
              <button
                onClick={handleDisconnect}
                disabled={saving}
                className="text-xs font-light px-3 py-2 rounded-lg transition-all disabled:opacity-40"
                style={{
                  background: 'rgba(220,60,60,0.08)',
                  border: '1px solid rgba(220,60,60,0.25)',
                  color: '#dc6b6b',
                }}
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}

      {/* Connect form */}
      <form
        onSubmit={handleSave}
        className="p-5 rounded-xl space-y-4"
        style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
      >
        <div>
          <p className="text-xs tracking-[0.1em] mb-2" style={{ color: 'var(--text-3)' }}>
            {status?.connected ? 'ROTATE KEY' : 'CONNECT ANTHROPIC ACCOUNT'}
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
            Paste a key from{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}
            >
              console.anthropic.com/settings/keys
            </a>
            . We&apos;ll validate it with a 1-token ping (cost: fractions of a cent) before
            storing.
          </p>
          <input
            type="password"
            value={rawKey}
            onChange={(e) => setRawKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            autoComplete="off"
            spellCheck={false}
            className="w-full text-sm font-mono px-3 py-2 rounded-lg focus:outline-none"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--glass-border)',
              color: 'rgba(255,255,255,0.9)',
            }}
          />
        </div>

        {error && (
          <p
            className="text-xs"
            style={{ color: '#dc6b6b' }}
          >
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs" style={{ color: '#C8F26B' }}>
            ✓ {success}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!rawKey.trim() || !activeEnvId || saving}
            className="text-xs font-light px-4 py-2 rounded-lg transition-all disabled:opacity-40"
            style={{
              background: 'rgba(200,242,107,0.1)',
              border: '1px solid rgba(200,242,107,0.25)',
              color: '#C8F26B',
            }}
          >
            {saving ? 'Validating…' : status?.connected ? 'Replace key' : 'Connect'}
          </button>
        </div>
      </form>

      <div
        className="mt-8 p-4 rounded-xl text-xs leading-relaxed"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          color: 'var(--text-3)',
        }}
      >
        <p className="mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Why BYOK?
        </p>
        <p>
          Your Anthropic key stays in your account, billed by Anthropic, rate-limited by your
          tier. GRID stores it encrypted at rest (AES-256-GCM) and decrypts it only in-memory at
          the moment Nova calls the API. It never appears in logs, error messages, or support
          exports. You can rotate or disconnect at any time.
        </p>
      </div>
    </div>
  );
}
