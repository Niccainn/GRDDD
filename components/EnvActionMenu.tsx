'use client';

/**
 * EnvActionMenu — the three-dot overflow popover that carries Share /
 * Rename / Delete on mobile, keeping the environment header to one
 * line on a 375px viewport. Desktop keeps the actions inline; this
 * component is only mounted inside the `md:hidden` branch.
 */

import { useState, useRef, useEffect } from 'react';
import ShareEnvironmentButton from './ShareEnvironmentButton';
import RenameButton from './RenameButton';
import DeleteButton from './DeleteButton';

type Env = { id: string; name: string };

export default function EnvActionMenu({ env }: { env: Env }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="More environment actions"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="1.2" />
          <circle cx="12" cy="12" r="1.2" />
          <circle cx="12" cy="19" r="1.2" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 rounded-xl p-1 min-w-[160px] z-30"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-shadow)',
          }}
          onClick={() => setOpen(false)}
        >
          <div className="flex flex-col gap-0.5 [&_button]:w-full [&_button]:text-left [&_button]:px-3 [&_button]:py-2 [&_button]:rounded-lg [&_button]:text-sm [&_button]:font-light [&_button]:transition-colors hover:[&_button]:bg-white/[0.04]">
            <ShareEnvironmentButton environmentId={env.id} />
            <RenameButton id={env.id} type="environments" currentName={env.name} />
            <DeleteButton id={env.id} type="environments" redirectTo="/environments" />
          </div>
        </div>
      )}
    </div>
  );
}
