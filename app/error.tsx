'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('GRID error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <div
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: 24,
          padding: '3rem 2.5rem',
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          backdropFilter: 'blur(40px)',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--danger-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 300,
            color: 'var(--text-1)',
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}
        >
          Something went wrong
        </h1>

        <p
          style={{
            color: 'var(--text-2)',
            fontWeight: 300,
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 8,
          }}
        >
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>

        {error.digest && (
          <p style={{ color: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-geist-mono)', marginBottom: 24 }}>
            Error ID: {error.digest}
          </p>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <button
            onClick={reset}
            style={{
              background: 'var(--brand)',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              padding: '10px 28px',
              fontSize: 14,
              fontWeight: 400,
              cursor: 'pointer',
              transition: 'all var(--duration) var(--ease)',
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{
              background: 'var(--glass)',
              color: 'var(--text-2)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-pill)',
              padding: '10px 28px',
              fontSize: 14,
              fontWeight: 300,
              textDecoration: 'none',
              transition: 'all var(--duration) var(--ease)',
            }}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
