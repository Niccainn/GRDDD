'use client';

import { useEffect, useRef } from 'react';
import { groupedShortcuts } from '@/lib/shortcuts';

type Props = {
  open: boolean;
  onClose: () => void;
};

const SECTION_ORDER = ['Navigation', 'Actions', 'Global'];

export default function ShortcutHelp({ open, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const groups = groupedShortcuts();

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          background: 'rgba(30, 30, 32, 0.85)',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          padding: '28px 32px',
          maxWidth: 520,
          width: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-2)',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              padding: '4px',
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {SECTION_ORDER.map((section) => {
          const items = groups[section];
          if (!items) return null;
          return (
            <div key={section} style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-2)',
                  marginBottom: 8,
                }}
              >
                {section}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 0',
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--text-1)' }}>
                      {shortcut.label}
                    </span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      {shortcut.key.split(' ').map((k, i) => (
                        <kbd
                          key={i}
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 6,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontFamily: 'inherit',
                            color: 'var(--text-2)',
                            lineHeight: '18px',
                            minWidth: 20,
                            textAlign: 'center',
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
