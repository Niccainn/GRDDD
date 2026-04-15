'use client';

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      style={{
        position: 'fixed',
        top: '-100%',
        left: '16px',
        zIndex: 99999,
        padding: '8px 20px',
        fontSize: '13px',
        fontWeight: 400,
        color: 'var(--text-1)',
        background: 'var(--glass)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-pill)',
        boxShadow: 'var(--glass-shadow-sm), var(--glass-inset)',
        textDecoration: 'none',
        outline: 'none',
        transition: 'top 0.2s var(--ease)',
      }}
      onFocus={(e) => {
        e.currentTarget.style.top = '16px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.top = '-100%';
      }}
    >
      Skip to content
    </a>
  );
}
