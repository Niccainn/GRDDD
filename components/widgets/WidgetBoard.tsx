'use client';
/**
 * WidgetBoard — the composition surface.
 *
 * Pre-canvas-engine (Phase 6): a flex-wrap grid of widgets.
 * Once the canvas engine lands, this component's only change is
 * swapping the container for a grid-layout with x/y coords.
 * Widgets themselves are unchanged.
 *
 * Persists user-added widgets to localStorage keyed by boardId so
 * different canvases can coexist without a DB migration. Phase 6
 * promotes this to a Canvas row.
 */
import { useCallback, useEffect, useState } from 'react';
import WidgetRenderer, { type WidgetRenderData } from './WidgetRenderer';
import WidgetDesigner from './WidgetDesigner';
import { CELL, type WidgetSpec } from '@/lib/widgets/registry';

export type BoardData = Record<string, WidgetRenderData | undefined>;

type Props = {
  boardId: string;
  /** Widgets shipped by the app (dashboard defaults, system page defaults). */
  systemSpecs: WidgetSpec[];
  /** Data keyed by widget id, or by a stable key the caller maps to ids. */
  data: BoardData;
  /** If true, the designer "+" tile appears at the end. */
  allowAdd?: boolean;
};

function loadUserWidgets(boardId: string): WidgetSpec[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`grid_widgets_${boardId}`);
    return raw ? (JSON.parse(raw) as WidgetSpec[]) : [];
  } catch {
    return [];
  }
}

function saveUserWidgets(boardId: string, widgets: WidgetSpec[]) {
  try {
    localStorage.setItem(`grid_widgets_${boardId}`, JSON.stringify(widgets));
  } catch {
    /* quota exceeded or private mode — non-fatal */
  }
}

export default function WidgetBoard({
  boardId,
  systemSpecs,
  data,
  allowAdd = true,
}: Props) {
  const [userSpecs, setUserSpecs] = useState<WidgetSpec[]>([]);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState(false);

  useEffect(() => {
    setUserSpecs(loadUserWidgets(boardId));
  }, [boardId]);

  const addWidget = useCallback(
    (spec: WidgetSpec) => {
      setUserSpecs(prev => {
        const next = [...prev, spec];
        saveUserWidgets(boardId, next);
        return next;
      });
    },
    [boardId],
  );

  const removeWidget = useCallback(
    (id: string) => {
      setUserSpecs(prev => {
        const next = prev.filter(w => w.id !== id);
        saveUserWidgets(boardId, next);
        return next;
      });
    },
    [boardId],
  );

  const allSpecs = [...systemSpecs, ...userSpecs];

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: CELL.gap,
          alignItems: 'flex-start',
        }}
      >
        {allSpecs.map(spec => (
          <WidgetRenderer
            key={spec.id}
            spec={spec}
            data={data[spec.id]}
            editMode={editingBoard && spec.origin === 'user'}
            onRemove={
              spec.origin === 'user'
                ? () => removeWidget(spec.id)
                : undefined
            }
          />
        ))}

        {allowAdd && (
          <AddTile onClick={() => setDesignerOpen(true)} />
        )}
      </div>

      {/* Board-level toggle — tap to enter edit mode across all user
          widgets at once. Appears only when there's at least one user
          widget to manage. */}
      {userSpecs.length > 0 && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            onClick={() => setEditingBoard(v => !v)}
            style={{
              fontSize: 11,
              padding: '6px 14px',
              borderRadius: 999,
              background: editingBoard ? 'rgba(200,242,107,0.12)' : 'var(--glass)',
              border: `1px solid ${editingBoard ? 'rgba(200,242,107,0.4)' : 'var(--glass-border)'}`,
              color: editingBoard ? 'var(--brand)' : 'var(--text-3)',
              cursor: 'pointer',
              fontWeight: 300,
            }}
          >
            {editingBoard ? 'Done editing' : 'Edit widgets'}
          </button>
        </div>
      )}

      <WidgetDesigner
        open={designerOpen}
        onClose={() => setDesignerOpen(false)}
        onSave={addWidget}
      />
    </>
  );
}

function AddTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Add widget"
      style={{
        width: 2 * CELL.width + CELL.gap,
        height: CELL.height,
        borderRadius: 20,
        border: '1px dashed var(--glass-border)',
        background: 'transparent',
        color: 'var(--text-3)',
        fontSize: 12,
        fontWeight: 300,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'all 260ms cubic-bezier(0.22, 1, 0.36, 1)',
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
      <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
      Add widget
    </button>
  );
}
