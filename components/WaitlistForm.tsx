'use client';

import { useState } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleWaitlist() {
    if (!email.includes('@')) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong');
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="glass-deep p-8 rounded-2xl animate-fade-in">
        <div className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)' }}>
          <span style={{ color: 'var(--brand)' }}>&#10003;</span>
        </div>
        <p className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>You&apos;re on the list</p>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>We&apos;ll reach out when your access is ready.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          onKeyDown={e => { if (e.key === 'Enter') handleWaitlist(); }}
          className="glass-input w-full sm:flex-1 px-5 py-3.5 text-sm"
        />
        <button
          onClick={handleWaitlist}
          disabled={submitting}
          className="w-full sm:w-auto px-6 py-3.5 text-sm font-light rounded-xl transition-all flex-shrink-0"
          style={{ background: 'var(--brand)', color: '#000', fontWeight: 400, opacity: submitting ? 0.5 : 1 }}>
          {submitting ? 'Joining...' : 'Request access'}
        </button>
      </div>
      {error && (
        <p className="text-xs mt-3" style={{ color: 'var(--danger)' }}>{error}</p>
      )}
    </>
  );
}
