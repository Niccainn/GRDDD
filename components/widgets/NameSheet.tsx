'use client';
/**
 * NameSheet — minimal bottom-sheet for capturing a single string.
 *
 * A quieter sibling of the WidgetDesigner sheet: grab handle,
 * swipe-down-to-dismiss, autofocus textbox, primary/secondary
 * buttons. Used anywhere we need "type a name and confirm" — new
 * canvas, rename, etc. — without falling back to window.prompt().
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DURATION, EASE } from '@/lib/widgets/motion';

type Props = {
  open: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
};

export default function NameSheet({
  open,
  title,
  placeholder = 'Name',
  initialValue = '',
  confirmLabel = 'Save',
  onClose,
  onConfirm,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [dragY, setDragY] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const dragState = useRef<{
    startY: number;
    startT: number;
    lastY: number;
    lastT: number;
    dragging: boolean;
  }>({
    startY: 0,
    startT: 0,
    lastY: 0,
    lastT: 0,
    dragging: false,
  });

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      // Autofocus after the sheet animates in.
      const t = setTimeout(() => inputRef.current?.focus(), 260);
      return () => clearTimeout(t);
    }
  }, [open, initialValue]);

  function onGrabTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    dragState.current = {
      startY: t.clientY,
      startT: Date.now(),
      lastY: t.clientY,
      lastT: Date.now(),
      dragging: true,
    };
    setDragY(0);
  }
  function onGrabTouchMove(e: React.TouchEvent) {
    if (!dragState.current.dragging) return;
    const t = e.touches[0];
    const dy = Math.max(0, t.clientY - dragState.current.startY);
    dragState.current.lastY = t.clientY;
    dragState.current.lastT = Date.now();
    setDragY(dy);
  }
  function onGrabTouchEnd() {
    const s = dragState.current;
    if (!s.dragging) return;
    s.dragging = false;
    const distance = s.lastY - s.startY;
    const duration = Math.max(1, s.lastT - s.startT);
    const velocity = distance / duration;
    if (distance > 80 || velocity > 0.5) {
      onClose();
    }
    setDragY(0);
  }

  function confirm() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  if (!open) return null;

  const backdrop: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(6px)',
    zIndex: 80,
    opacity: open ? 1 : 0,
    transition: `opacity ${DURATION.settle}ms ${EASE.settle}`,
  };

  const sheet: CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(16,16,20,0.96)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: '24px 28px 32px',
    transform: open ? `translateY(${dragY}px)` : 'translateY(100%)',
    transition: dragState.current.dragging
      ? 'none'
      : `transform ${DURATION.settle}ms ${EASE.settle}`,
    touchAction: 'pan-y',
    zIndex: 81,
  };

  const primaryBtn: CSSProperties = {
    padding: '10px 20px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    border: 'none',
    background: value.trim() ? 'var(--brand)' : 'var(--glass)',
    color: value.trim() ? '#000' : 'var(--text-3)',
    cursor: value.trim() ? 'pointer' : 'not-allowed',
    transition: `all ${DURATION.hover}ms ${EASE.settle}`,
  };

  const secondaryBtn: CSSProperties = {
    padding: '10px 16px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 300,
    background: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-2)',
    cursor: 'pointer',
  };

  return (
    <>
      <div style={backdrop} onClick={onClose} />
      <div style={sheet} role="dialog" aria-label={title}>
        <div
          onTouchStart={onGrabTouchStart}
          onTouchMove={onGrabTouchMove}
          onTouchEnd={onGrabTouchEnd}
          onTouchCancel={onGrabTouchEnd}
          style={{
            height: 22,
            margin: '-24px -28px 12px',
            padding: '10px 0 4px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            touchAction: 'none',
            cursor: 'grab',
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
            }}
          />
        </div>

        <h2
          style={{
            fontSize: 18,
            fontWeight: 300,
            color: 'var(--text-1)',
            margin: '0 0 18px',
          }}
        >
          {title}
        </h2>

        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') confirm();
            if (e.key === 'Escape') onClose();
          }}
          placeholder={placeholder}
          maxLength={80}
          className="glass-input"
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: 14,
            borderRadius: 12,
          }}
        />

        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            marginTop: 18,
          }}
        >
          <button onClick={onClose} style={secondaryBtn}>
            Cancel
          </button>
          <button onClick={confirm} disabled={!value.trim()} style={primaryBtn}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
