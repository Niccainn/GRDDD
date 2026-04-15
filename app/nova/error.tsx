'use client';

import { useEffect } from 'react';

export default function NovaError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('Nova error:', error); }, [error]);

  return (
    <div style={{ padding: '3rem 2.5rem', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--nova-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--nova)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 300, color: 'var(--text-1)', marginBottom: 8 }}>Nova failed to load</h2>
      <p style={{ color: 'var(--text-2)', fontWeight: 300, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        {error.message || 'Something went wrong connecting to Nova.'}
      </p>
      <button onClick={reset} style={{ background: 'var(--nova)', color: '#000', border: 'none', borderRadius: 'var(--radius-pill)', padding: '10px 28px', fontSize: 14, fontWeight: 400, cursor: 'pointer' }}>
        Reconnect
      </button>
    </div>
  );
}
