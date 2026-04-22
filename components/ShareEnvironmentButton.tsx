'use client';

/**
 * ShareEnvironmentButton — generates a signed read-only public URL
 * for the caller's environment and copies it to the clipboard.
 *
 * Owner-only operation (server-enforced). The button surfaces the
 * fallback reason inline if sharing is disabled (no secret
 * configured, rate limited, etc).
 */

import { useState } from 'react';

type Props = { environmentId: string };

export default function ShareEnvironmentButton({ environmentId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');

  async function share() {
    setState('loading');
    setMessage('');
    try {
      const res = await fetch(`/api/environments/${environmentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttlDays: 30 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState('error');
        setMessage(data.error ?? 'Unable to create share link');
        return;
      }
      setUrl(data.url);
      try {
        await navigator.clipboard.writeText(data.url);
        setState('copied');
        setMessage('Copied · expires in 30 days');
      } catch {
        setState('copied');
        setMessage('Link ready — copy it below');
      }
    } catch {
      setState('error');
      setMessage('Network error');
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={share}
        disabled={state === 'loading'}
        className="text-xs font-light transition-colors"
        style={{
          color: state === 'error' ? '#FF6B6B' : 'rgba(200,200,255,0.7)',
          opacity: state === 'loading' ? 0.5 : 1,
        }}
        aria-label="Share this environment"
      >
        {state === 'loading'
          ? 'Signing link…'
          : state === 'copied'
          ? 'Link copied'
          : 'Share'}
      </button>
      {message && (
        <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
          · {message}
        </span>
      )}
      {state === 'copied' && url && (
        <input
          readOnly
          value={url}
          onFocus={e => e.currentTarget.select()}
          className="text-[11px] font-light px-2 py-1 rounded hidden md:block"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-2)',
            width: 260,
          }}
        />
      )}
    </div>
  );
}
