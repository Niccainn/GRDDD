'use client';
/**
 * WidgetDesigner — bottom-sheet widget composer.
 *
 * Inspired by iOS's widget picker: slides up from below, presents
 * the user with exactly three decisions:
 *   1. Where does the data come from? (System, Integration, Query,
 *      a Nova answer, or static payload)
 *   2. What shape should it be? (the widget kind — stat, feed, etc.)
 *   3. What should it be called?
 *
 * Output: a WidgetSpec the parent persists to a Canvas. This
 * component is pure UI — persistence is the caller's job. That
 * way the same designer works for the dashboard canvas, a System
 * canvas, a user-scoped private canvas, and so on.
 *
 * Visual language: Grid glass + lime, not iOS blue. Apple's
 * *rhythm*, Grid's *tone*.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  WIDGET_SIZES,
  type WidgetKind,
  type WidgetSize,
  type WidgetSource,
  type WidgetSpec,
} from '@/lib/widgets/registry';
import { DURATION, EASE } from '@/lib/widgets/motion';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (spec: WidgetSpec) => void;
  /** Default source — e.g. when opened from a System page,
      pre-select that System so the user doesn't re-enter it. */
  defaultSource?: WidgetSource;
};

const KIND_META: Record<
  Exclude<WidgetKind, 'chart' | 'custom'>,
  { label: string; description: string; accent: string }
> = {
  stat: {
    label: 'Number',
    description: 'A single big number. Good for KPIs, counts, balances.',
    accent: '#15AD70',
  },
  feed: {
    label: 'Feed',
    description: 'Rolling list of items. Good for tasks, drafts, alerts.',
    accent: '#7193ED',
  },
  system: {
    label: 'System',
    description: 'Snapshot of one System — health + last Nova action.',
    accent: '#C8F26B',
  },
  integration: {
    label: 'Integration',
    description: 'Connection status + last sync for one integration.',
    accent: '#F7C700',
  },
  'nova-output': {
    label: 'Nova answer',
    description: 'Pin a Nova response as a live widget.',
    accent: '#BF9FF1',
  },
};

const SOURCE_KINDS: Array<{
  id: WidgetSource['type'];
  label: string;
  sub: string;
}> = [
  { id: 'system', label: 'A System', sub: 'Marketing, Operations, …' },
  { id: 'integration', label: 'An integration', sub: 'Gmail, Stripe, Notion' },
  { id: 'query', label: 'A custom query', sub: 'Any /api endpoint' },
  { id: 'nova', label: 'Nova', sub: "Pin Nova's last answer" },
  { id: 'static', label: 'Just text', sub: 'Notes & reminders' },
];

export default function WidgetDesigner({
  open,
  onClose,
  onSave,
  defaultSource,
}: Props) {
  const [sourceKind, setSourceKind] = useState<WidgetSource['type']>('system');
  const [kind, setKind] = useState<WidgetKind>('stat');
  const [size, setSize] = useState<WidgetSize>('2x1');
  const [title, setTitle] = useState('');
  const [sourceRef, setSourceRef] = useState<string>('');

  // Systems + integrations lists for the source pickers.
  const [systems, setSystems] = useState<
    Array<{ id: string; name: string; color: string | null }>
  >([]);
  const [integrations, setIntegrations] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/systems')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setSystems(d))
      .catch(() => {});
    fetch('/api/integrations')
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : d?.providers ?? [];
        setIntegrations(
          list.map((p: { id: string; name?: string; displayName?: string }) => ({
            id: p.id,
            name: p.name ?? p.displayName ?? p.id,
          })),
        );
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (defaultSource) {
      setSourceKind(defaultSource.type);
      if ('id' in defaultSource) setSourceRef(defaultSource.id);
    }
  }, [defaultSource]);

  // Clamp size to the available sizes for the chosen kind.
  useEffect(() => {
    const allowed = WIDGET_SIZES[kind];
    if (!allowed.includes(size)) setSize(allowed[0]);
  }, [kind, size]);

  // Swipe-down-to-dismiss. Tracks the touch delta on the grab
  // handle + sheet header. Releases: if the user dragged >80px
  // or released with >0.5px/ms velocity, dismiss; otherwise
  // spring back into place.
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    startY: number;
    startT: number;
    lastY: number;
    lastT: number;
    dragging: boolean;
  }>({ startY: 0, startT: 0, lastY: 0, lastT: 0, dragging: false });
  const [dragY, setDragY] = useState(0);

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
    const velocity = distance / duration; // px/ms
    if (distance > 80 || velocity > 0.5) {
      onClose();
    }
    setDragY(0);
  }

  if (!open) return null;

  function save() {
    const source: WidgetSource | null = (() => {
      switch (sourceKind) {
        case 'system':
          return sourceRef ? { type: 'system', id: sourceRef } : null;
        case 'integration':
          return sourceRef ? { type: 'integration', providerId: sourceRef } : null;
        case 'query':
          return sourceRef ? { type: 'query', path: sourceRef } : null;
        case 'nova':
          return { type: 'nova', conversationId: '', messageId: '' };
        case 'static':
          return { type: 'static', payload: sourceRef };
        default:
          return null;
      }
    })();
    if (!source) return;

    const spec: WidgetSpec = {
      id: `w_${Math.random().toString(36).slice(2, 10)}`,
      kind,
      size,
      title: title.trim() || KIND_META[kind as keyof typeof KIND_META]?.label || 'Widget',
      source,
      refresh: { mode: 'interval', seconds: 60 },
      origin: 'user',
      createdAt: new Date().toISOString(),
    };
    onSave(spec);
    onClose();
    // Reset for next open.
    setTitle('');
    setSourceRef('');
  }

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
    maxHeight: '88vh',
    overflow: 'auto',
    background: 'rgba(16,16,20,0.96)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: '24px 28px 36px',
    transform: open ? `translateY(${dragY}px)` : 'translateY(100%)',
    transition: dragState.current.dragging
      ? 'none'
      : `transform ${DURATION.settle}ms ${EASE.settle}`,
    touchAction: 'pan-y',
    zIndex: 81,
  };

  const pill: CSSProperties = {
    padding: '8px 14px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 300,
    border: '1px solid var(--glass-border)',
    background: 'var(--glass)',
    color: 'var(--text-2)',
    cursor: 'pointer',
    transition: `all ${DURATION.hover}ms ${EASE.settle}`,
  };

  const pillActive: CSSProperties = {
    ...pill,
    background: 'rgba(200,242,107,0.12)',
    borderColor: 'rgba(200,242,107,0.4)',
    color: 'var(--brand)',
  };

  return (
    <>
      <div style={backdrop} onClick={onClose} />
      <div ref={sheetRef} style={sheet} role="dialog" aria-label="Design a widget">
        {/* Grab handle — iOS style. The top 32px is a touch-drag
            zone that dismisses the sheet on pull-down. */}
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
            margin: '0 0 24px',
          }}
        >
          Design a widget
        </h2>

        {/* Step 1 — Source */}
        <Section label="What should it show?">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SOURCE_KINDS.map(s => (
              <button
                key={s.id}
                onClick={() => setSourceKind(s.id)}
                style={sourceKind === s.id ? pillActive : pill}
                title={s.sub}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Conditional source picker */}
          {sourceKind === 'system' && (
            <select
              value={sourceRef}
              onChange={e => setSourceRef(e.target.value)}
              className="glass-input"
              style={{ marginTop: 12, width: '100%', padding: '10px 12px', fontSize: 13 }}
            >
              <option value="">Pick a System…</option>
              {systems.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          {sourceKind === 'integration' && (
            <select
              value={sourceRef}
              onChange={e => setSourceRef(e.target.value)}
              className="glass-input"
              style={{ marginTop: 12, width: '100%', padding: '10px 12px', fontSize: 13 }}
            >
              <option value="">Pick an integration…</option>
              {integrations.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          )}
          {sourceKind === 'query' && (
            <input
              type="text"
              value={sourceRef}
              onChange={e => setSourceRef(e.target.value)}
              placeholder="/api/dashboard/feed"
              className="glass-input"
              style={{ marginTop: 12, width: '100%', padding: '10px 12px', fontSize: 13, fontFamily: 'monospace' }}
            />
          )}
          {sourceKind === 'static' && (
            <input
              type="text"
              value={sourceRef}
              onChange={e => setSourceRef(e.target.value)}
              placeholder="A short note to keep on-canvas"
              className="glass-input"
              style={{ marginTop: 12, width: '100%', padding: '10px 12px', fontSize: 13 }}
            />
          )}
        </Section>

        {/* Step 2 — Shape */}
        <Section label="What shape?">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map(k => (
              <button
                key={k}
                onClick={() => setKind(k)}
                style={{
                  ...(kind === k ? pillActive : pill),
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '10px 14px',
                  textAlign: 'left',
                }}
                title={KIND_META[k].description}
              >
                <span style={{ fontSize: 12, fontWeight: 500 }}>
                  {KIND_META[k].label}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                  {KIND_META[k].description}
                </span>
              </button>
            ))}
          </div>

          {/* Size picker — only the sizes valid for this kind */}
          <div
            style={{
              marginTop: 14,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
              }}
            >
              Size
            </span>
            {WIDGET_SIZES[kind].map(sz => (
              <button
                key={sz}
                onClick={() => setSize(sz)}
                style={size === sz ? pillActive : pill}
              >
                {sz}
              </button>
            ))}
          </div>
        </Section>

        {/* Step 3 — Name */}
        <Section label="Name it">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Today's drafts"
            className="glass-input"
            style={{ width: '100%', padding: '10px 12px', fontSize: 13 }}
          />
        </Section>

        {/* Save row */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 24,
            justifyContent: 'flex-end',
          }}
        >
          <button onClick={onClose} style={pill}>
            Cancel
          </button>
          <button
            onClick={save}
            style={{
              ...pill,
              background: 'var(--brand)',
              color: '#000',
              borderColor: 'transparent',
              fontWeight: 500,
              padding: '10px 20px',
            }}
          >
            Add to canvas
          </button>
        </div>
      </div>
    </>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p
        style={{
          fontSize: 10,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--text-3)',
          margin: '0 0 10px',
          fontWeight: 400,
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
