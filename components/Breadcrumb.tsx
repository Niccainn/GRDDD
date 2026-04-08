'use client';

import Link from 'next/link';

type Crumb = {
  label: string;
  href?: string;
};

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 mb-6 animate-fade-in">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.2 }}>
              <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-xs font-light transition-colors hover:text-white/60"
              style={{ color: 'var(--text-3)' }}
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
