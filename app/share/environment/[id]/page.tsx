/**
 * /share/environment/[id]?t=<token>
 *
 * Public, unauthenticated read-only view of an Environment. Same
 * visual language as the logged-in app so a screenshot of this page
 * is indistinguishable from a screenshot of the real product.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

type PublicEnv = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  slug: string;
  createdAt: string;
  systems: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    healthScore: number | null;
    workflows: number;
  }[];
};

export default function SharedEnvironmentPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const token = search.get('t');

  const [env, setEnv] = useState<PublicEnv | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('This share link is missing its token.');
      return;
    }
    fetch(`/api/public/environments/${params.id}?t=${encodeURIComponent(token)}`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) {
          setError(
            data.error === 'expired'
              ? 'This share link has expired.'
              : 'This share link is no longer valid.',
          );
          return;
        }
        setEnv(data.environment);
        setExpiresAt(data.expiresAt);
      })
      .catch(() => setError('Unable to reach the server.'));
  }, [params.id, token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div
          className="max-w-sm text-center rounded-2xl p-8"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <p
            className="text-[10px] tracking-[0.16em] uppercase mb-3 font-light"
            style={{ color: 'var(--text-3)' }}
          >
            Share link
          </p>
          <h1 className="text-lg font-light mb-2" style={{ color: 'var(--text-1)' }}>
            {error}
          </h1>
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            Ask the person who shared this page for a fresh link.
          </p>
        </div>
      </div>
    );
  }

  if (!env) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
          Loading shared environment…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 md:px-10 py-10">
      <div className="max-w-4xl mx-auto">
        {/* Shared banner */}
        <div
          className="flex items-center justify-between mb-8 px-4 py-2 rounded-full"
          style={{
            background: 'rgba(113,147,237,0.08)',
            border: '1px solid rgba(113,147,237,0.2)',
            color: '#7193ED',
          }}
        >
          <span className="text-[11px] font-light tracking-wider uppercase">
            Read-only · shared view
          </span>
          {expiresAt && (
            <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
              Expires {new Date(expiresAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {env.color && (
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: env.color }}
            />
          )}
          <div>
            <h1
              className="text-2xl font-extralight tracking-tight mb-1"
              style={{ color: 'var(--text-1)' }}
            >
              {env.name}
            </h1>
            {env.description && (
              <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
                {env.description}
              </p>
            )}
          </div>
        </div>

        {/* Systems */}
        <p
          className="text-xs tracking-[0.16em] uppercase mb-3 font-light"
          style={{ color: 'var(--text-3)' }}
        >
          {env.systems.length} system{env.systems.length !== 1 ? 's' : ''}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {env.systems.map(s => (
            <div
              key={s.id}
              className="rounded-xl p-5"
              style={{
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                {s.color && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: s.color }}
                  />
                )}
                <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
                  {s.name}
                </p>
                {s.healthScore !== null && (
                  <span
                    className="ml-auto text-xs font-light"
                    style={{
                      color:
                        s.healthScore >= 80
                          ? '#C8F26B'
                          : s.healthScore >= 60
                          ? '#F5D76E'
                          : '#FF6B6B',
                    }}
                  >
                    {Math.round(s.healthScore)}%
                  </span>
                )}
              </div>
              {s.description && (
                <p
                  className="text-xs font-light leading-relaxed mb-3"
                  style={{ color: 'var(--text-3)' }}
                >
                  {s.description}
                </p>
              )}
              <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                {s.workflows} workflow{s.workflows !== 1 ? 's' : ''}
              </p>
            </div>
          ))}
          {env.systems.length === 0 && (
            <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
              This environment has no systems yet.
            </p>
          )}
        </div>

        <p
          className="text-[11px] font-light mt-10 text-center"
          style={{ color: 'var(--text-3)' }}
        >
          This is a read-only snapshot. Shared with a time-limited link.
        </p>
      </div>
    </div>
  );
}
