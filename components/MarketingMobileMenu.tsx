'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Item = { href: string; label: string };

export default function MarketingMobileMenu({
  items,
  ctaHref = '#waitlist',
  ctaLabel = 'Request access',
}: {
  items: Item[];
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="md:hidden inline-flex items-center justify-center w-9 h-9 -mr-2 rounded-full transition-colors"
        style={{ color: 'var(--text-2)' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          {open ? (
            <>
              <path d="M4 4L14 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M14 4L4 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M3 6H15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M3 12H15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      {open && mounted ? createPortal(
        <div
          className="md:hidden fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          style={{ background: 'var(--bg)' }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
            style={{
              background:
                'radial-gradient(ellipse at top, rgba(200,242,107,0.06), transparent 60%), radial-gradient(ellipse at 20% 60%, rgba(113,147,237,0.05), transparent 60%)',
            }}
          />
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 w-full h-full cursor-default"
            style={{ background: 'transparent' }}
          />
          <div className="relative flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2.5">
              <svg width="24" height="31" viewBox="0 0 79 100" fill="none" style={{ color: 'var(--text-1)' }}>
                <rect x="2" y="2" width="75" height="96" rx="8" stroke="currentColor" strokeWidth="2" />
                <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="currentColor" strokeWidth="2" />
                <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span className="text-sm font-light tracking-[0.18em]" style={{ color: 'var(--text-2)' }}>GRID</span>
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center w-9 h-9 -mr-2 rounded-full"
              style={{ color: 'var(--text-2)' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path d="M4 4L14 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M14 4L4 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <nav
            className="relative flex flex-col px-6 pt-8 pb-10 gap-1"
            onClick={e => e.stopPropagation()}
          >
            {items.map(item => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-2xl font-extralight py-3 transition-colors"
                style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}
              >
                {item.label}
              </a>
            ))}
            <a
              href={ctaHref}
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex items-center justify-center text-sm font-light px-5 py-3 rounded-full self-start"
              style={{
                background: 'var(--brand-soft)',
                border: '1px solid var(--brand-border)',
                color: 'var(--brand)',
              }}
            >
              {ctaLabel}
            </a>
          </nav>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
