'use client';

/**
 * WidgetPicker — the onboarding step where users pick which widgets
 * will appear on their Environment page before Nova finishes building.
 *
 * Reads the department catalog. Every preset is a toggleable card.
 * Recommended presets are on by default; the user can deselect any.
 *
 * On submit, persists the UNSELECTED set to localStorage under the
 * same key the System page's HideablePanel reads, so the two
 * surfaces stay in sync without server roundtrip.
 */

import { useMemo, useState } from 'react';
import {
  DEPARTMENTS,
  type DepartmentId,
  getDepartment,
  writeHiddenPresets,
} from '@/lib/widgets/department-catalog';

type Props = {
  /** The department derived from the selected wedge. */
  departmentId: DepartmentId;
  /** The systemId Nova is about to create. Passed post-build. */
  systemId?: string | null;
  onContinue: (hiddenPresetIds: string[]) => void;
  onBack?: () => void;
};

const GLYPH_SVG: Record<string, React.ReactNode> = {
  dot: <circle cx="6" cy="6" r="2.5" />,
  target: (
    <>
      <circle cx="6" cy="6" r="4.5" fill="none" strokeWidth="1" />
      <circle cx="6" cy="6" r="1.5" />
    </>
  ),
  chart: <path d="M1 10V2M1 10h10M3 8V5M5.5 8V3.5M8 8V6M10.5 8V4" strokeWidth="1" strokeLinecap="round" fill="none" />,
  feed: <path d="M1 3h10M1 6h10M1 9h7" strokeWidth="1" strokeLinecap="round" fill="none" />,
  spark: <path d="M1 8l2.5-4L6 7l2-5 2.5 6" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  brain: (
    <path
      d="M4 2a2 2 0 0 0-2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 0 2 2M8 2a2 2 0 0 1 2 2v1a2 2 0 0 1 0 4v1a2 2 0 0 1-2 2M6 2v10"
      strokeWidth="0.8"
      fill="none"
    />
  ),
  inbox: <path d="M1 3h10v6H1zM1 6h3l1 1h2l1-1h3" strokeWidth="1" fill="none" />,
  scale: <path d="M6 1v10M2 3h8M2 3l-1 3h2zM10 3l-1 3h2z" strokeWidth="1" fill="none" strokeLinejoin="round" />,
  compass: (
    <>
      <circle cx="6" cy="6" r="4.5" fill="none" strokeWidth="1" />
      <path d="M4.5 7.5L6 3l1.5 4.5L6 6z" strokeWidth="0.8" />
    </>
  ),
  sun: (
    <>
      <circle cx="6" cy="6" r="2" fill="none" strokeWidth="1" />
      <path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11M2.5 2.5l1 1M8.5 8.5l1 1M9.5 2.5l-1 1M3.5 8.5l-1 1" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
};

export default function WidgetPicker({ departmentId, systemId, onContinue, onBack }: Props) {
  const department = useMemo(() => getDepartment(departmentId), [departmentId]);

  // Start with the recommended set ON. Selected means "user wants it."
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(department.presets.filter(p => p.recommended).map(p => p.id))
  );

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(department.presets.map(p => p.id)));
  }
  function selectRecommended() {
    setSelected(new Set(department.presets.filter(p => p.recommended).map(p => p.id)));
  }

  function handleContinue() {
    // Hidden = every preset in this department NOT selected.
    const hidden = department.presets.filter(p => !selected.has(p.id)).map(p => p.id);
    if (systemId) {
      writeHiddenPresets(systemId, new Set(hidden));
    }
    onContinue(hidden);
  }

  const allCount = department.presets.length;
  const recommendedCount = department.presets.filter(p => p.recommended).length;

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <p className="text-[11px] font-light tracking-[0.18em] uppercase mb-2" style={{ color: 'var(--text-3)' }}>
          Customize · {department.name}
        </p>
        <h1 className="text-2xl font-light mb-2" style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
          Pick what shows up on your {department.name.toLowerCase()} page
        </h1>
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
          {department.tagline}. You can always add or remove these later — nothing here is permanent.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={selectRecommended}
          className="text-xs font-light px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(200,242,107,0.08)',
            border: '1px solid rgba(200,242,107,0.2)',
            color: '#C8F26B',
          }}
        >
          Recommended ({recommendedCount})
        </button>
        <button
          onClick={selectAll}
          className="text-xs font-light px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-2)',
          }}
        >
          Select all ({allCount})
        </button>
        <button
          onClick={() => setSelected(new Set())}
          className="text-xs font-light px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-3)',
          }}
        >
          Clear
        </button>
        <span className="ml-auto text-xs font-light" style={{ color: 'var(--text-3)' }}>
          {selected.size} selected
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {department.presets.map(p => {
          const on = selected.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className="text-left rounded-2xl p-4 transition-all"
              style={{
                background: on ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                border: on
                  ? `1px solid ${p.color}50`
                  : '1px solid rgba(255,255,255,0.06)',
                boxShadow: on ? `0 0 0 1px ${p.color}20 inset` : 'none',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${p.color}18`, border: `1px solid ${p.color}30`, color: p.color }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" stroke="currentColor">
                    {GLYPH_SVG[p.glyph] ?? GLYPH_SVG.dot}
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-light truncate" style={{ color: 'var(--text-1)' }}>
                      {p.title}
                    </p>
                    {p.recommended && (
                      <span className="text-[9px] font-light tracking-wider uppercase px-1.5 py-0.5 rounded-full" style={{ color: '#C8F26B', background: 'rgba(200,242,107,0.08)' }}>
                        Suggested
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-light mb-1.5" style={{ color: 'var(--text-3)' }}>
                    {p.subtitle}
                  </p>
                  <p className="text-[11px] font-light leading-snug" style={{ color: 'var(--text-2)' }}>
                    {p.rationale}
                  </p>
                </div>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: on ? p.color : 'transparent',
                    border: `1px solid ${on ? p.color : 'rgba(255,255,255,0.12)'}`,
                  }}
                >
                  {on && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#000" strokeWidth="2">
                      <path d="M1 4l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            onClick={onBack}
            className="text-sm font-light px-5 py-2.5 rounded-xl"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={handleContinue}
          className="text-sm font-light px-6 py-2.5 rounded-xl"
          style={{
            background: 'rgba(200,242,107,0.15)',
            border: '1px solid rgba(200,242,107,0.3)',
            color: '#C8F26B',
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
