'use client';
/**
 * AuthPathways — every sign-in pathway except the email/password form.
 *
 * Renders:
 *   - OAuth buttons (Google, GitHub, …) for every provider the server
 *     reports as configured
 *   - A "Continue with demo" button that never fails
 *   - A divider before the password form
 *
 * Fetches /api/auth/providers on mount so a provider can be enabled
 * just by setting env vars — no code change needed.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

interface ProvidersResponse {
  oauth: Array<{ id: string; label: string }>;
  demo: boolean;
}

const PROVIDER_ICON: Record<string, React.ReactNode> = {
  google: (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.87-6.87C35.64 2.4 30.2 0 24 0 14.82 0 6.88 5.24 3 12.88l8.01 6.22C12.9 13.22 17.98 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M11.01 28.9c-.51-1.52-.8-3.14-.8-4.9s.29-3.38.8-4.9l-8.01-6.22C1.18 16.31 0 20.03 0 24s1.18 7.69 3.2 11.12l7.81-6.22z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.02 0-11.1-3.72-12.92-9.09l-8.01 6.22C6.88 42.76 14.82 48 24 48z"/>
    </svg>
  ),
  github: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.92.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.41-1.27.74-1.56-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.4-5.26 5.69.42.36.8 1.08.8 2.18v3.24c0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"/>
    </svg>
  ),
};

const ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: 'Google sign-in is not configured yet.',
  github_not_configured: 'GitHub sign-in is not configured yet.',
  oauth_missing_code: 'Provider did not return a code. Please try again.',
  oauth_state_mismatch: 'Security check failed. Please try again.',
  oauth_exchange_failed: 'Could not complete sign-in with that provider.',
};

export function AuthPathways({ urlError }: { urlError?: string | null }) {
  const [providers, setProviders] = useState<ProvidersResponse | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [localError, setLocalError] = useState<string>('');
  const router = useRouter();
  const { refresh } = useAuth();

  useEffect(() => {
    let active = true;
    fetch('/api/auth/providers')
      .then((r) => r.json())
      .then((data: ProvidersResponse) => {
        if (active) setProviders(data);
      })
      .catch(() => {
        if (active) setProviders({ oauth: [], demo: true });
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleDemo() {
    setDemoLoading(true);
    setLocalError('');
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setLocalError(data.error || 'Demo sign-in failed');
        setDemoLoading(false);
        return;
      }
      refresh();
      router.push('/dashboard');
    } catch {
      setLocalError('Connection error');
      setDemoLoading(false);
    }
  }

  const displayError = localError || (urlError ? ERROR_MESSAGES[urlError] ?? urlError : '');
  const oauth = providers?.oauth ?? [];

  return (
    <div className="space-y-3">
      {displayError && (
        <p
          className="text-xs px-3 py-2 rounded-lg"
          style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}
        >
          {displayError}
        </p>
      )}

      {oauth.map((p) => (
        <a
          key={p.id}
          href={`/api/auth/oauth/${p.id}`}
          className="w-full py-3 text-sm font-light rounded-full transition-all flex items-center justify-center gap-2.5"
          style={{
            background: 'var(--glass-1, rgba(255,255,255,0.04))',
            border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
            color: 'var(--text-1)',
          }}
        >
          {PROVIDER_ICON[p.id]}
          Continue with {p.label}
        </a>
      ))}

      {providers?.demo && (
        <button
          type="button"
          onClick={handleDemo}
          disabled={demoLoading}
          className="w-full py-3 text-sm font-light rounded-full transition-all flex items-center justify-center gap-2"
          style={{
            background: 'var(--glass-1, rgba(255,255,255,0.03))',
            border: '1px dashed var(--glass-border, rgba(255,255,255,0.12))',
            color: 'var(--text-2)',
            opacity: demoLoading ? 0.5 : 1,
          }}
          title="Dev only — disabled in production"
        >
          {demoLoading ? 'Opening demo…' : '✨ Dev sandbox'}
        </button>
      )}

      <div className="relative flex items-center py-1">
        <div className="flex-grow border-t" style={{ borderColor: 'var(--glass-border, rgba(255,255,255,0.08))' }} />
        <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
          or with email
        </span>
        <div className="flex-grow border-t" style={{ borderColor: 'var(--glass-border, rgba(255,255,255,0.08))' }} />
      </div>
    </div>
  );
}
