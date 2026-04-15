import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <div
        style={{
          textAlign: 'center',
          maxWidth: 480,
        }}
      >
        {/* 404 number */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 100,
            letterSpacing: '-0.06em',
            lineHeight: 1,
            color: 'var(--text-3)',
            marginBottom: 16,
            opacity: 0.3,
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: 'var(--text-1)',
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}
        >
          Page not found
        </h1>

        <p
          style={{
            color: 'var(--text-2)',
            fontWeight: 300,
            fontSize: 15,
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link
            href="/dashboard"
            style={{
              background: 'var(--brand)',
              color: '#000',
              borderRadius: 'var(--radius-pill)',
              padding: '10px 28px',
              fontSize: 14,
              fontWeight: 400,
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            Go to dashboard
          </Link>
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
              transition: 'all 0.2s',
            }}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
