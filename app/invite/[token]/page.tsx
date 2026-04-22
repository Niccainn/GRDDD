'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type InviteInfo = {
  environmentName: string;
  inviterName: string;
  role: string;
  email: string;
};

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'accepting' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch(`/api/auth/accept-invite/info?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setState('error'); setErrorMsg(d.error); return; }
        setInfo(d);
        setState('ready');
      })
      .catch(() => { setState('error'); setErrorMsg('Could not load invitation details.'); });
  }, [token]);

  function accept() {
    setState('accepting');
    // Redirect to the server-side route that consumes the token + creates membership
    window.location.href = `/api/auth/accept-invite?token=${encodeURIComponent(token)}`;
  }

  const roleCopy: Record<string, string> = { ADMIN: 'Admin', CONTRIBUTOR: 'Contributor', VIEWER: 'Viewer' };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg, #09090e)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-8"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(40px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="1" y="1" width="8" height="26" rx="2" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
            <rect x="11" y="1" width="8" height="26" rx="2" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
            <rect x="21" y="1" width="6" height="26" rx="2" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          </svg>
          <span className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.5)' }}>GRID</span>
        </div>

        {state === 'loading' && (
          <p className="text-sm font-light" style={{ color: 'var(--text-3, rgba(255,255,255,0.35))' }}>
            Loading invitation…
          </p>
        )}

        {state === 'error' && (
          <>
            <h1 className="text-lg font-light mb-2" style={{ color: 'var(--text-1, #fff)' }}>
              Invitation not found
            </h1>
            <p className="text-sm font-light mb-6" style={{ color: 'var(--text-3, rgba(255,255,255,0.35))' }}>
              {errorMsg || 'This invitation may have expired or already been accepted.'}
            </p>
            <button
              onClick={() => router.push('/sign-in')}
              className="w-full text-sm font-light py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
            >
              Go to sign in
            </button>
          </>
        )}

        {(state === 'ready' || state === 'accepting') && info && (
          <>
            <h1 className="text-lg font-light mb-1" style={{ color: 'var(--text-1, #fff)' }}>
              You're invited
            </h1>
            <p className="text-sm font-light mb-6" style={{ color: 'var(--text-3, rgba(255,255,255,0.4))' }}>
              {info.inviterName} invited you to join <strong style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>{info.environmentName}</strong> as a{' '}
              <strong style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>{roleCopy[info.role] ?? info.role}</strong>.
            </p>

            <div
              className="rounded-xl px-4 py-3 mb-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-[11px] font-light mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>INVITED EMAIL</p>
              <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.7)' }}>{info.email}</p>
            </div>

            <button
              onClick={accept}
              disabled={state === 'accepting'}
              className="w-full text-sm font-light py-3 rounded-xl mb-3 disabled:opacity-50"
              style={{ background: 'var(--brand, #C8F26B)', color: '#000' }}
            >
              {state === 'accepting' ? 'Joining…' : `Join ${info.environmentName}`}
            </button>

            <p className="text-[11px] text-center font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>
              By accepting you agree to GRID's terms. If you don't have an account yet, you'll be asked to create one.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
