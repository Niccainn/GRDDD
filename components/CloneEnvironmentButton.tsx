'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CloneEnvironmentButton({
  environmentId,
  sourceName,
}: {
  environmentId: string;
  sourceName: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`${sourceName} (copy)`);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleClone(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCloning(true);
    setError('');

    const res = await fetch(`/api/environments/${environmentId}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      setOpen(false);
      router.push(`/environments/${data.slug}`);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Clone failed');
      setCloning(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setName(`${sourceName} (copy)`); setError(''); setOpen(true); }}
        className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        Clone
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-md mx-4 rounded-2xl p-6"
            style={{ background: 'var(--surface-2, #1a1a1a)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="mb-5">
              <h2 className="text-base font-light mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Clone environment
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                Creates a full copy of <span style={{ color: 'rgba(255,255,255,0.5)' }}>{sourceName}</span> — all systems, workflows, and Nova configurations. Cloned workflows start as drafts.
              </p>
            </div>

            <form onSubmit={handleClone} className="space-y-4">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>
                  New environment name
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  placeholder="e.g. Staging"
                  className="w-full text-sm font-light px-3 py-2.5 rounded-lg focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${error ? 'rgba(255,107,107,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    color: 'white',
                  }}
                />
                {error && (
                  <p className="text-xs mt-1.5" style={{ color: '#FF6B6B' }}>{error}</p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={!name.trim() || cloning}
                  className="flex-1 text-sm font-light py-2.5 rounded-xl transition-all disabled:opacity-40"
                  style={{
                    background: 'rgba(200,242,107,0.12)',
                    border: '1px solid rgba(200,242,107,0.25)',
                    color: '#C8F26B',
                  }}
                >
                  {cloning ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                      Cloning…
                    </span>
                  ) : (
                    'Clone environment'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-light"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
