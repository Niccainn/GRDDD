'use client';
/**
 * WidgetContextMenu — the long-press / right-click menu.
 *
 * Fires on:
 *   • Desktop right-click (contextmenu event)
 *   • Touch press-and-hold (handled by caller — this component is
 *     presentation only)
 *
 * Appears near the press point. Dismisses on tap-outside, Escape,
 * or an action selection. Positioned with a small offset so the
 * user's finger/cursor doesn't sit on top of the first item.
 *
 * Motion: drops in with the same settle curve as widgets so the
 * menu feels like it belongs to the same system. No fancy cascade.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { DURATION, EASE } from '@/lib/widgets/motion';

export type ContextMenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

type Props = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

const MENU_WIDTH = 190;
const MENU_PADDING = 6;

export default function WidgetContextMenu({ x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Dismiss on outside tap / escape.
  useEffect(() => {
    const onDocPointer = (e: Event) => {
      const t = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(t)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Clamp the menu inside viewport so it never renders off-screen.
  const clampedX =
    typeof window !== 'undefined'
      ? Math.min(x, window.innerWidth - MENU_WIDTH - MENU_PADDING)
      : x;
  const clampedY =
    typeof window !== 'undefined'
      ? Math.min(y, window.innerHeight - items.length * 44 - MENU_PADDING * 2)
      : y;

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        left: clampedX,
        top: clampedY,
        width: MENU_WIDTH,
        padding: MENU_PADDING,
        background: 'rgba(16,16,20,0.96)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
        zIndex: 90,
        animation: `grid-widget-dropin ${DURATION.settle}ms ${EASE.settle} both`,
        willChange: 'transform, opacity',
      }}
      onClick={e => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <button
          key={item.id}
          role="menuitem"
          onClick={() => {
            if (item.disabled) return;
            item.onSelect();
            onClose();
          }}
          disabled={item.disabled}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: 'transparent',
            border: 'none',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 300,
            textAlign: 'left',
            color: item.destructive
              ? '#FF6B6B'
              : item.disabled
                ? 'var(--text-3)'
                : 'var(--text-1)',
            cursor: item.disabled ? 'not-allowed' : 'pointer',
            transition: `background ${DURATION.hover}ms ${EASE.settle}`,
            opacity: item.disabled ? 0.4 : 1,
            marginTop: i > 0 ? 2 : 0,
          }}
          onMouseEnter={e => {
            if (!item.disabled) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {item.icon && (
            <span
              style={{
                width: 16,
                display: 'flex',
                justifyContent: 'center',
                opacity: 0.6,
              }}
            >
              {item.icon}
            </span>
          )}
          <span style={{ flex: 1 }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
