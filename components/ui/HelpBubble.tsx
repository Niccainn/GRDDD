'use client';

/**
 * HelpBubble — the tiny `?` bubble that sits next to any section
 * header. Click opens a small popover with a 3-sentence explainer
 * plus an optional "learn more" link.
 *
 * Usage:
 *   <HelpBubble
 *     title="What are Projects?"
 *     body="A Project is one prompt becoming a plan..."
 *     learnMoreHref="/blog/what-are-projects"
 *   />
 *
 * The body is deliberately kept short — three sentences. If the user
 * wants more, they follow the link. Prevents the pattern from turning
 * into a documentation dumping ground.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Props = {
  title: string;
  body: string;
  learnMoreHref?: string;
  learnMoreLabel?: string;
  side?: 'top' | 'bottom';
};

export default function HelpBubble({
  title,
  body,
  learnMoreHref,
  learnMoreLabel = 'Learn more →',
  side = 'bottom',
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={`Help: ${title}`}
        aria-expanded={open}
        className="w-4 h-4 rounded-full flex items-center justify-center transition-colors"
        style={{
          background: open ? 'rgba(191,159,241,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(191,159,241,0.35)' : 'rgba(255,255,255,0.08)'}`,
          color: open ? '#BF9FF1' : 'var(--text-3)',
          fontSize: 9,
          fontWeight: 300,
        }}
      >
        ?
      </button>
      {open && (
        <span
          role="dialog"
          className={`absolute z-50 ${side === 'bottom' ? 'top-6' : 'bottom-6'} left-1/2 -translate-x-1/2`}
          style={{
            width: 280,
            padding: 14,
            background: 'rgba(12,12,18,0.98)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            textAlign: 'left',
          }}
        >
          <p
            className="text-[11px] tracking-[0.16em] uppercase font-light mb-2"
            style={{ color: '#BF9FF1' }}
          >
            {title}
          </p>
          <p
            className="text-xs font-light leading-relaxed mb-3"
            style={{ color: 'var(--text-2)' }}
          >
            {body}
          </p>
          {learnMoreHref && (
            <Link
              href={learnMoreHref}
              onClick={() => setOpen(false)}
              className="text-[11px] font-light"
              style={{ color: 'var(--brand)' }}
            >
              {learnMoreLabel}
            </Link>
          )}
        </span>
      )}
    </span>
  );
}
