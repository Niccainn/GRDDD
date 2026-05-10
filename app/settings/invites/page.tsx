/**
 * /settings/invites — admin UI for the invitation flow.
 *
 * Replaces the curl-only path from PR #70. An admin (defined by
 * GRID_ADMIN_EMAILS env var) can paste an email, optionally tag a
 * cohort, and receive the invite link in one click. Recent invites
 * surface below with state — pending / accepted / expired.
 *
 * Non-admin visitors land on the same 404 the API returns. No
 * existence side-channel.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

type InviteState = 'pending' | 'accepted' | 'expired';

type InviteRow = {
  id: string;
  email: string;
  cohort: string | null;
  issuedAt: string;
  expiresAt: string;
  usedAt: string | null;
  state: InviteState;
};

type IssuedInvite = {
  id: string;
  email: string;
  cohort: string | null;
  expiresAt: string;
  link: string;
  emailSent: boolean;
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return 'expired';
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

export default function InvitesAdminPage() {
  const { toast } = useToast();
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [cohort, setCohort] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastIssued, setLastIssued] = useState<IssuedInvite | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/invites', { cache: 'no-store' });
      if (res.status === 404) {
        // Same 404 the API returns for non-admins. Render the
        // friendly not-found state below.
        setAuthorized(false);
        setLoaded(true);
        return;
      }
      if (!res.ok) {
        setError(`Couldn't load invites (${res.status})`);
        setLoaded(true);
        return;
      }
      const data = (await res.json()) as { invites: InviteRow[] };
      setInvites(data.invites ?? []);
      setAuthorized(true);
      setLoaded(true);
    } catch {
      setError('Network error loading invites.');
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Valid email required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), cohort: cohort.trim() || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(String(body.error ?? `Failed (${res.status})`));
        return;
      }
      const data = (await res.json()) as IssuedInvite;
      setLastIssued(data);
      setEmail('');
      setCohort('');
      toast(data.emailSent ? 'Invite sent — email delivered.' : 'Invite created. Copy the link below to share.', 'success');
      refresh();
    } catch {
      setError('Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link).then(
      () => toast('Link copied to clipboard', 'success'),
      () => toast('Copy failed — select and copy manually', 'error'),
    );
  }

  if (!loaded) {
    return (
      <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Loading…</p>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="px-4 md:px-10 py-12 min-h-screen flex flex-col items-center justify-center text-center">
        <p className="text-sm font-light mb-2" style={{ color: 'var(--text-2)' }}>Not found</p>
        <p className="text-xs font-light max-w-sm" style={{ color: 'var(--text-3)' }}>
          This page is admin-only. If you should have access, ask an existing admin to add your
          email to <code style={{ color: '#C8F26B' }}>GRID_ADMIN_EMAILS</code>.
        </p>
        <Link href="/dashboard" className="text-xs font-light mt-6" style={{ color: '#C8F26B' }}>
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen max-w-3xl">
      <div className="mb-10">
        <p
          className="text-[10px] tracking-[0.18em] uppercase font-light mb-2"
          style={{ color: 'var(--text-3)' }}
        >
          Settings · Invites
        </p>
        <h1 className="text-xl md:text-2xl font-extralight tracking-tight mb-1">
          Invite recipients
        </h1>
        <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
          Mint single-use, 14-day links. Recipients sign up at the bound email only.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={submit}
        className="rounded-2xl p-5 mb-8"
        style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
      >
        <div className="grid gap-3 md:grid-cols-[1fr_220px_120px] md:items-end">
          <div>
            <label
              htmlFor="invite-email"
              className="block text-[11px] tracking-[0.04em] mb-1.5 font-light"
              style={{ color: 'var(--text-3)' }}
            >
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="someone@company.com"
              className="w-full text-sm font-light px-3 py-2.5 rounded-lg outline-none"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-1)',
              }}
              autoComplete="off"
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="invite-cohort"
              className="block text-[11px] tracking-[0.04em] mb-1.5 font-light"
              style={{ color: 'var(--text-3)' }}
            >
              Cohort tag <span style={{ color: 'rgba(255,255,255,0.2)' }}>· optional</span>
            </label>
            <input
              id="invite-cohort"
              type="text"
              value={cohort}
              onChange={e => setCohort(e.target.value)}
              placeholder="design-partner-batch-1"
              className="w-full text-sm font-light px-3 py-2.5 rounded-lg outline-none"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-1)',
              }}
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="text-sm font-light px-4 py-2.5 rounded-lg transition-all disabled:opacity-30"
            style={{
              background: '#C8F26B',
              color: '#000',
            }}
          >
            {submitting ? 'Sending…' : 'Send invite'}
          </button>
        </div>
        {error && (
          <p className="text-xs font-light mt-3" style={{ color: '#FF6B6B' }}>{error}</p>
        )}
      </form>

      {/* Last issued banner */}
      {lastIssued && (
        <div
          className="rounded-2xl p-4 mb-8 flex flex-col gap-3"
          style={{
            background: 'rgba(200,242,107,0.05)',
            border: '1px solid rgba(200,242,107,0.2)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#C8F26B', boxShadow: '0 0 6px rgba(200,242,107,0.6)' }}
            />
            <p
              className="text-[10px] tracking-[0.18em] uppercase font-light"
              style={{ color: '#C8F26B' }}
            >
              Invite ready · {lastIssued.email}
            </p>
            <span
              className="text-[10px] font-light ml-auto"
              style={{ color: 'var(--text-3)' }}
            >
              {lastIssued.emailSent ? 'Email sent' : 'Email not configured — copy & send manually'}
            </span>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <input
              readOnly
              value={lastIssued.link}
              className="flex-1 text-xs font-light bg-transparent outline-none"
              style={{ color: 'var(--text-2)', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            />
            <button
              type="button"
              onClick={() => copyLink(lastIssued.link)}
              className="text-xs font-light px-3 py-1.5 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-2)',
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {invites.length === 0 ? (
          <p className="text-xs font-light py-6 text-center" style={{ color: 'var(--text-3)' }}>
            No invites yet.
          </p>
        ) : (
          invites.map(i => (
            <div
              key={i.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                opacity: i.state === 'expired' ? 0.5 : 1,
              }}
            >
              <span
                aria-hidden
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background:
                    i.state === 'accepted'
                      ? '#C8F26B'
                      : i.state === 'pending'
                        ? '#7193ED'
                        : 'rgba(255,255,255,0.2)',
                  boxShadow:
                    i.state === 'pending' ? '0 0 6px rgba(113,147,237,0.5)' : undefined,
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-light truncate" style={{ color: 'var(--text-1)' }}>
                  {i.email}
                </p>
                {i.cohort && (
                  <p className="text-[10px] font-light mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {i.cohort}
                  </p>
                )}
              </div>
              <span
                className="text-[10px] font-light tracking-[0.06em] uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  color:
                    i.state === 'accepted'
                      ? '#C8F26B'
                      : i.state === 'pending'
                        ? '#7193ED'
                        : 'var(--text-3)',
                  background:
                    i.state === 'accepted'
                      ? 'rgba(200,242,107,0.08)'
                      : i.state === 'pending'
                        ? 'rgba(113,147,237,0.08)'
                        : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${
                    i.state === 'accepted'
                      ? 'rgba(200,242,107,0.2)'
                      : i.state === 'pending'
                        ? 'rgba(113,147,237,0.2)'
                        : 'var(--glass-border)'
                  }`,
                }}
              >
                {i.state}
              </span>
              <span className="text-[10px] font-light w-20 text-right flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                {i.state === 'accepted'
                  ? `accepted ${timeAgo(i.usedAt!)}`
                  : i.state === 'pending'
                    ? timeUntil(i.expiresAt)
                    : `${timeAgo(i.expiresAt)}`}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
