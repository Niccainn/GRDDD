'use client';

/**
 * /environments/trash — recover or permanently delete soft-deleted
 * environments.
 *
 * Notion / Monday convention:
 *   - Soft-deleted envs land here for 30 days
 *   - Restore action returns them to /environments active list
 *   - Empty action hard-deletes (irreversible)
 *   - Cron job auto-purges after the retention window
 *
 * Cross-link: the env list at /environments has a "View trash"
 * link that brings users here.
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchObject } from '@/lib/api/safe-fetch';

type TrashedEnv = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  deletedAt: string;
  autoPurgeAt: string;
  daysUntilAutoPurge: number;
};

export default function EnvironmentTrashPage() {
  const [envs, setEnvs] = useState<TrashedEnv[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchObject<{ environments: TrashedEnv[] }>('/api/environments/trash')
      .then(d => {
        setEnvs(Array.isArray(d?.environments) ? d!.environments : []);
        setLoaded(true);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function restore(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/environments/${id}/restore`, { method: 'POST' });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('grid:environments-changed'));
        window.dispatchEvent(new CustomEvent('grid:systems-changed'));
        window.dispatchEvent(new CustomEvent('grid:workflows-changed'));
        setEnvs(prev => prev.filter(e => e.id !== id));
      }
    } finally {
      setBusy(null);
    }
  }

  async function purge(id: string, name: string) {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/environments/${id}?purge=1`, { method: 'DELETE' });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('grid:environments-changed'));
        setEnvs(prev => prev.filter(e => e.id !== id));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
      <div className="mb-8">
        <Link href="/environments"
          className="text-[10px] tracking-[0.14em] uppercase font-light hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-3)' }}>
          ← Environments
        </Link>
        <h1 className="text-xl md:text-2xl font-extralight tracking-tight mt-2 mb-1">Trash</h1>
        <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
          Trashed environments. Auto-deleted after 30 days. Restore returns them with all systems, workflows, and data intact.
        </p>
      </div>

      {!loaded ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      ) : envs.length === 0 ? (
        <div className="flex flex-col items-center py-24 rounded-xl"
          style={{ border: '1px dashed var(--glass-border)' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>Trash is empty</p>
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            Deleted environments will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {envs.map(env => {
            const urgent = env.daysUntilAutoPurge <= 7;
            return (
              <div key={env.id} className="rounded-xl p-5"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {env.color && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: env.color, opacity: 0.5 }} />
                      )}
                      <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>{env.name}</p>
                    </div>
                    {env.description && (
                      <p className="text-xs font-light mb-2" style={{ color: 'var(--text-3)' }}>
                        {env.description}
                      </p>
                    )}
                    <p className="text-[11px] font-light"
                      style={{ color: urgent ? '#F5D76E' : 'var(--text-3)' }}>
                      {env.daysUntilAutoPurge === 0
                        ? 'Auto-deletes today'
                        : env.daysUntilAutoPurge === 1
                        ? 'Auto-deletes tomorrow'
                        : `Auto-deletes in ${env.daysUntilAutoPurge} days`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => restore(env.id)}
                      disabled={busy === env.id}
                      className="text-xs font-light px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                      style={{
                        background: 'rgba(200,242,107,0.08)',
                        border: '1px solid rgba(200,242,107,0.25)',
                        color: '#C8F26B',
                      }}>
                      Restore
                    </button>
                    <button
                      onClick={() => purge(env.id, env.name)}
                      disabled={busy === env.id}
                      className="text-xs font-light px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                      style={{
                        background: 'rgba(255,107,107,0.06)',
                        border: '1px solid rgba(255,107,107,0.25)',
                        color: '#FF6B6B',
                      }}>
                      Delete forever
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
