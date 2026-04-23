/**
 * OAuthProviders — renders every enabled OAuth sign-in button plus a
 * single "or" divider below them. Replaces the pair GoogleButton +
 * MicrosoftButton when both may appear, so there is at most one
 * divider regardless of which combination is configured.
 *
 * Hides entirely when no OAuth provider is configured (pure password
 * sign-in flow).
 */
'use client';

import { useEffect, useState } from 'react';

type Props = { next?: string };

type Provider = 'google' | 'microsoft' | 'github';

const META: Record<Provider, { label: string; icon: React.ReactNode }> = {
  google: {
    label: 'Continue with Google',
    icon: (
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
        <path
          fill="#FFC107"
          d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
        />
        <path
          fill="#FF3D00"
          d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
        />
      </svg>
    ),
  },
  microsoft: {
    label: 'Continue with Microsoft',
    icon: (
      <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden>
        <rect x="1" y="1" width="10" height="10" fill="#F25022" />
        <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
        <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
        <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
      </svg>
    ),
  },
  github: {
    label: 'Continue with GitHub',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 .5C5.37.5 0 5.87 0 12.5a12 12 0 008.205 11.385c.6.11.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.725-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.238 1.84 1.238 1.07 1.835 2.81 1.305 3.495.998.108-.775.42-1.305.763-1.605-2.665-.305-5.467-1.335-5.467-5.93 0-1.31.47-2.38 1.235-3.22-.124-.304-.535-1.525.117-3.176 0 0 1.008-.323 3.3 1.23a11.51 11.51 0 016 0c2.29-1.553 3.297-1.23 3.297-1.23.653 1.651.242 2.872.119 3.176.77.84 1.234 1.91 1.234 3.22 0 4.605-2.807 5.62-5.48 5.92.43.372.814 1.102.814 2.222 0 1.605-.014 2.898-.014 3.293 0 .32.218.694.825.576A12 12 0 0024 12.5C24 5.87 18.63.5 12 .5z" />
      </svg>
    ),
  },
};

// Rendering order when multiple providers are enabled. Google first
// (statistically the higher conversion path), Microsoft second
// (enterprise), GitHub third (developer audiences).
const ORDER: Provider[] = ['google', 'microsoft', 'github'];

export default function OAuthProviders({ next }: Props) {
  const [providers, setProviders] = useState<Provider[] | null>(null);

  useEffect(() => {
    fetch('/api/auth/providers')
      .then(r => r.json())
      .then(data => {
        const enabled: Provider[] = Array.isArray(data.oauth)
          ? (data.oauth as string[]).filter((p): p is Provider =>
              p === 'google' || p === 'microsoft' || p === 'github',
            )
          : [];
        setProviders(enabled);
      })
      .catch(() => setProviders([]));
  }, []);

  // Prevent flash while the providers endpoint is loading.
  if (providers === null) return <div className="h-[50px]" />;
  if (providers.length === 0) return null;

  const rendered = ORDER.filter(p => providers.includes(p));

  return (
    <>
      <div className="space-y-3">
        {rendered.map(p => {
          const meta = META[p];
          const href = `/api/auth/oauth/${p}/start${next ? `?next=${encodeURIComponent(next)}` : ''}`;
          return (
            <a
              key={p}
              href={href}
              className="group w-full flex items-center justify-center gap-3 py-[13px] rounded-full text-sm font-light transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'var(--text-1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
              }}
            >
              <span className="flex items-center justify-center w-4 h-4">{meta.icon}</span>
              <span>{meta.label}</span>
            </a>
          );
        })}
      </div>
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span
          className="text-[10px] uppercase tracking-[0.14em] font-light"
          style={{ color: 'var(--text-3)' }}
        >
          or
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
    </>
  );
}
