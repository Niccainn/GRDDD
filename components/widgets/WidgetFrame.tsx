'use client';
/**
 * WidgetFrame — shared chrome for every widget.
 *
 * Responsibilities:
 *   • Consistent glass + border per Grid's visual language.
 *   • Hover lift (2px rise + soft shadow).
 *   • Edit mode: long-press (500ms) enters; child widgets breathe;
 *     a remove dot appears in the top-left; tap outside to exit.
 *   • Drop-in animation on mount.
 *
 * Does NOT handle drag-drop yet — that's Phase 6 (canvas engine).
 * Exposes the hooks (`editMode`, `onRemove`, `onResize`) so when
 * the canvas lands, existing widgets work unchanged.
 */
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type MouseEvent,
  type TouchEvent,
} from 'react';
import {
  BREATH_KEYFRAMES,
  DROP_IN_KEYFRAMES,
  DROP_IN_STYLE,
  DURATION,
  EASE,
  EDIT_MODE_STYLE,
  LIFT_STYLE,
} from '@/lib/widgets/motion';
import { sizeToPx, type WidgetSize } from '@/lib/widgets/registry';

type WidgetFrameProps = {
  size: WidgetSize;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  editMode?: boolean;
  onEnterEdit?: () => void;
  onRemove?: () => void;
  onOpen?: () => void;
  /** If true, the widget will breathe regardless of local long-press. */
  forceEdit?: boolean;
  accent?: string;
};

const LONG_PRESS_MS = 500;

export default function WidgetFrame({
  size,
  title,
  subtitle,
  children,
  editMode,
  onEnterEdit,
  onRemove,
  onOpen,
  forceEdit,
  accent,
}: WidgetFrameProps) {
  const [hovering, setHovering] = useState(false);
  const [localEdit, setLocalEdit] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const px = sizeToPx(size);
  const isEditing = editMode || localEdit || forceEdit;

  // Touch devices should never show the hover-lift — a tap would
  // trigger hover + then the click, making the UI feel laggy. Gate
  // hover visuals on devices that genuinely support hover.
  const supportsHover =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(hover: hover)')?.matches;

  // Inject keyframes once per page load. Using an id prevents
  // duplicates if multiple widgets mount simultaneously.
  useEffect(() => {
    const id = 'grid-widget-motion-keyframes';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = BREATH_KEYFRAMES + DROP_IN_KEYFRAMES;
    document.head.appendChild(style);
  }, []);

  // Exit edit mode when the user taps outside the widget.
  useEffect(() => {
    if (!localEdit) return;
    const exit = (e: Event) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setLocalEdit(false);
      }
    };
    document.addEventListener('mousedown', exit);
    document.addEventListener('touchstart', exit);
    return () => {
      document.removeEventListener('mousedown', exit);
      document.removeEventListener('touchstart', exit);
    };
  }, [localEdit]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  function beginPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      setLocalEdit(true);
      onEnterEdit?.();
      // Soft haptic echo where available.
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean })
            .vibrate?.(8);
        } catch {
          /* ignore unsupported */
        }
      }
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function handleClick(e: MouseEvent) {
    if (isEditing) {
      // In edit mode a plain click doesn't open — users must exit
      // edit first by tapping outside.
      e.preventDefault();
      return;
    }
    onOpen?.();
  }

  const baseStyle: CSSProperties = {
    width: px.width,
    height: px.height,
    background: 'var(--glass)',
    border: '1px solid var(--glass-border)',
    borderRadius: 20,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    cursor: isEditing ? 'grab' : onOpen ? 'pointer' : 'default',
    transition: `transform ${DURATION.hover}ms ${EASE.settle}, box-shadow ${DURATION.hover}ms ${EASE.settle}, border-color ${DURATION.hover}ms ${EASE.settle}`,
    ...(hovering && supportsHover && !isEditing ? LIFT_STYLE : {}),
    ...(isEditing ? EDIT_MODE_STYLE : {}),
    ...DROP_IN_STYLE,
  };

  return (
    <div
      ref={containerRef}
      style={baseStyle}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        cancelPress();
      }}
      onMouseDown={beginPress}
      onMouseUp={cancelPress}
      onTouchStart={(_: TouchEvent) => beginPress()}
      onTouchEnd={cancelPress}
      onTouchCancel={cancelPress}
      onClick={handleClick}
    >
      {/* Accent hairline — echoes the System color without shouting */}
      {accent && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 12,
            right: 12,
            height: 1,
            background: `linear-gradient(90deg, transparent 0%, ${accent}80 50%, transparent 100%)`,
            opacity: 0.6,
          }}
        />
      )}

      {/* Remove affordance — appears only in edit mode.
          Visual 22×22 but the hit area is 44×44 (Apple HIG minimum)
          via an outer padded anchor wrapping the visible dot. */}
      {isEditing && onRemove && (
        <button
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          onTouchStart={e => e.stopPropagation()}
          aria-label="Remove widget"
          style={{
            position: 'absolute',
            top: -6,
            left: -6,
            width: 44,
            height: 44,
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 22,
              height: 22,
              borderRadius: 22,
              background: 'rgba(255,107,107,0.95)',
              color: '#fff',
              fontSize: 14,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
            }}
          >
            −
          </span>
        </button>
      )}

      {(title || subtitle) && (
        <header style={{ marginBottom: 10 }}>
          {title && (
            <p
              style={{
                fontSize: 10,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
                margin: 0,
                fontWeight: 300,
              }}
            >
              {title}
            </p>
          )}
          {subtitle && (
            <p
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                margin: '2px 0 0',
                fontWeight: 300,
              }}
            >
              {subtitle}
            </p>
          )}
        </header>
      )}

      <div style={{ height: '100%', overflow: 'hidden' }}>{children}</div>
    </div>
  );
}
