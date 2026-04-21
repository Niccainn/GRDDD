'use client';
/**
 * CanvasSwitcher — horizontal strip of canvas tabs with a "+" at the
 * end. Active canvas highlighted in lime. Scrollable on narrow
 * viewports via native horizontal overflow. Long-press a tab for
 * Rename / Delete via the shared WidgetContextMenu.
 *
 * Visual: muted glass pills, active = filled lime. Same motion
 * language as widgets (settle ease, no bounce).
 */
import { useState } from 'react';
import WidgetContextMenu from './WidgetContextMenu';
import { DURATION, EASE } from '@/lib/widgets/motion';

export type CanvasTab = {
  id: string;
  name: string;
  icon?: string | null;
};

type Props = {
  canvases: CanvasTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
};

export default function CanvasSwitcher({
  canvases,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: Props) {
  const [menuFor, setMenuFor] = useState<{ id: string; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [pressTimer, setPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  function openMenu(id: string, x: number, y: number) {
    setMenuFor({ id, x, y });
  }

  function startLongPress(id: string, x: number, y: number) {
    const t = setTimeout(() => openMenu(id, x, y), 500);
    setPressTimer(t);
  }
  function cancelLongPress() {
    if (pressTimer) clearTimeout(pressTimer);
    setPressTimer(null);
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        overflowX: 'auto',
        padding: '4px 2px',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
    >
      {canvases.map(c => {
        const active = c.id === activeId;
        const isRenaming = renaming?.id === c.id;
        return (
          <div
            key={c.id}
            style={{ position: 'relative', flexShrink: 0 }}
            onContextMenu={e => {
              e.preventDefault();
              openMenu(c.id, e.clientX, e.clientY);
            }}
            onTouchStart={e => {
              const t = e.touches[0];
              startLongPress(c.id, t?.clientX ?? 0, t?.clientY ?? 0);
            }}
            onTouchEnd={cancelLongPress}
            onTouchCancel={cancelLongPress}
            onTouchMove={cancelLongPress}
          >
            {isRenaming ? (
              <input
                autoFocus
                value={renaming.value}
                onChange={e => setRenaming({ ...renaming, value: e.target.value })}
                onBlur={() => {
                  const v = renaming.value.trim();
                  if (v.length > 0 && v !== c.name) onRename(renaming.id, v);
                  setRenaming(null);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  } else if (e.key === 'Escape') {
                    setRenaming(null);
                  }
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 400,
                  background: 'rgba(200,242,107,0.12)',
                  border: '1px solid rgba(200,242,107,0.4)',
                  color: 'var(--brand)',
                  outline: 'none',
                  minWidth: 100,
                }}
              />
            ) : (
              <button
                onClick={() => onSelect(c.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: active ? 500 : 300,
                  background: active
                    ? 'rgba(200,242,107,0.14)'
                    : 'var(--glass)',
                  border: `1px solid ${active ? 'rgba(200,242,107,0.4)' : 'var(--glass-border)'}`,
                  color: active ? 'var(--brand)' : 'var(--text-2)',
                  cursor: 'pointer',
                  transition: `all ${DURATION.hover}ms ${EASE.settle}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {c.icon && <span style={{ marginRight: 6 }}>{c.icon}</span>}
                {c.name}
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={onCreate}
        aria-label="New canvas"
        style={{
          padding: '6px 10px',
          borderRadius: 999,
          fontSize: 14,
          lineHeight: 1,
          background: 'var(--glass)',
          border: '1px dashed var(--glass-border)',
          color: 'var(--text-3)',
          cursor: 'pointer',
          flexShrink: 0,
          transition: `all ${DURATION.hover}ms ${EASE.settle}`,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(200,242,107,0.4)';
          e.currentTarget.style.color = 'var(--brand)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--glass-border)';
          e.currentTarget.style.color = 'var(--text-3)';
        }}
      >
        +
      </button>

      {menuFor && (
        <WidgetContextMenu
          x={menuFor.x}
          y={menuFor.y}
          items={[
            {
              id: 'rename',
              label: 'Rename',
              onSelect: () => {
                const c = canvases.find(cv => cv.id === menuFor.id);
                if (c) setRenaming({ id: c.id, value: c.name });
              },
            },
            {
              id: 'delete',
              label: 'Delete',
              destructive: true,
              disabled: canvases.length <= 1,
              onSelect: () => onDelete(menuFor.id),
            },
          ]}
          onClose={() => setMenuFor(null)}
        />
      )}
    </div>
  );
}
