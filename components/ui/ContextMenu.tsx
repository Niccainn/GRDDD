'use client';

/**
 * ContextMenu — the right-click menu primitive. Wraps any element.
 * On right-click, opens a floating menu anchored at the cursor.
 * Closes on Escape, outside click, or item selection.
 *
 * Usage:
 *   <ContextMenu items={[
 *     { label: 'Rename', kbd: '⌘R', onSelect: () => ... },
 *     { label: 'Delete', tone: 'danger', onSelect: () => ... },
 *     { separator: true },
 *     { label: 'Copy link', onSelect: () => ... },
 *   ]}>
 *     <div>row content</div>
 *   </ContextMenu>
 *
 * Keyboard discoverability: hint tokens render on the right. Danger
 * tone uses the brand-safe red. Separator renders a thin divider.
 */

import { useEffect, useRef, useState } from 'react';

type Item =
  | {
      label: string;
      onSelect: () => void;
      kbd?: string;
      tone?: 'default' | 'danger';
      disabled?: boolean;
    }
  | { separator: true };

type Props = {
  items: Item[];
  children: React.ReactNode;
  /** Disable the right-click trigger (e.g. while editing). */
  disabled?: boolean;
};

export default function ContextMenu({ items, children, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClose = () => setOpen(false);
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('keydown', onEsc);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('keydown', onEsc);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  function onContext(e: React.MouseEvent) {
    if (disabled) return;
    e.preventDefault();
    // Clamp the menu to viewport so it never opens off-screen.
    const width = 220;
    const height = items.length * 32 + 12;
    const x = Math.min(e.clientX, window.innerWidth - width - 8);
    const y = Math.min(e.clientY, window.innerHeight - height - 8);
    setPos({ x, y });
    setOpen(true);
  }

  return (
    <>
      <div onContextMenu={onContext} style={{ display: 'contents' }}>
        {children}
      </div>
      {open && (
        <div
          ref={ref}
          role="menu"
          className="fixed z-[80] rounded-xl overflow-hidden py-1 min-w-[220px]"
          style={{
            top: pos.y,
            left: pos.x,
            background: 'rgba(12,12,18,0.98)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          }}
        >
          {items.map((item, i) => {
            if ('separator' in item) {
              return (
                <div
                  key={`sep-${i}`}
                  style={{
                    height: 1,
                    margin: '4px 0',
                    background: 'var(--glass-border)',
                  }}
                />
              );
            }
            const danger = item.tone === 'danger';
            return (
              <button
                key={item.label + i}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  item.onSelect();
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between gap-4 px-3 py-1.5 text-left text-xs font-light transition-colors disabled:opacity-40"
                style={{
                  color: danger ? '#E04E4E' : 'var(--text-2)',
                  background: 'transparent',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
              >
                <span>{item.label}</span>
                {item.kbd && (
                  <kbd
                    style={{
                      padding: '1px 5px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 3,
                      fontFamily: 'ui-monospace, Menlo, monospace',
                      fontSize: 10,
                      color: 'var(--text-3)',
                    }}
                  >
                    {item.kbd}
                  </kbd>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
