'use client';

import Link from 'next/link';

export default function LegalFooter() {
  return (
    <footer
      className="w-full py-6 px-5 md:px-8 mt-auto"
      style={{ borderTop: '1px solid var(--glass-border)' }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="14" height="18" viewBox="0 0 79 100" fill="none" style={{ opacity: 0.3 }}>
            <rect x="2" y="2" width="75" height="96" rx="8" stroke="white" strokeWidth="2"/>
            <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="2"/>
            <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="2"/>
          </svg>
          <span className="text-[10px]" style={{ color: 'var(--text-3)', opacity: 0.5 }}>
            GRID Systems Inc.
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/privacy"
            className="text-[10px] transition-colors hover:text-white/60"
            style={{ color: 'var(--text-3)', opacity: 0.5 }}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-[10px] transition-colors hover:text-white/60"
            style={{ color: 'var(--text-3)', opacity: 0.5 }}
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
