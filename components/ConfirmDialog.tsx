'use client';
import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'default',
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  const confirmBg =
    variant === 'danger'
      ? 'var(--danger)'
      : variant === 'warning'
        ? 'var(--warning)'
        : 'var(--glass)';

  const confirmColor =
    variant === 'danger'
      ? '#fff'
      : variant === 'warning'
        ? '#000'
        : 'var(--text-1)';

  const confirmBorder =
    variant === 'default' ? '1px solid var(--glass-border)' : 'none';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ animation: 'confirmFadeIn 150ms ease-out' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onCancel}
      />

      {/* Panel */}
      <div
        className="relative max-w-sm w-full mx-4 rounded-xl p-6"
        style={{
          background: 'var(--glass-deep, var(--glass))',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <h3
          className="text-lg font-light mb-2"
          style={{ color: 'var(--text-1)' }}
        >
          {title}
        </h3>

        <p
          className="text-sm font-light mb-6"
          style={{ color: 'var(--text-3)' }}
        >
          {message}
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-5 py-2 rounded-xl text-sm font-light transition-colors cursor-pointer"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-2)',
            }}
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl text-sm font-light transition-colors cursor-pointer"
            style={{
              background: confirmBg,
              border: confirmBorder,
              color: confirmColor,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes confirmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
