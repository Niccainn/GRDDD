'use client';

/**
 * NovaTrace — the "show the trace" primitive.
 *
 * Pillar 2 of the cognition-platform framing: every artifact Nova
 * touched should show, inline, what Nova read, decided, and skipped.
 * Not in a separate side-panel. Not behind an "Open in audit log"
 * link. Right at the artifact, where the human is making the
 * review-or-override decision.
 *
 * The compact form is one line: a brand dot, "Nova" label, and the
 * decision in plain prose. Click anywhere on the strip to expand the
 * full trace — read sources, confidence, optional skipped list. ESC
 * or a second click collapses.
 *
 * Designed to render inside Signal rows, Task rows, Activity rows,
 * Execution rows — anywhere a Nova-driven decision lives. Pure
 * presentation; the caller fetches and shapes the data.
 */
import { useState } from 'react';

export type NovaTraceData = {
  /** What Nova read to make this decision. Free-form short labels
   *  ("inbox: gmail", "memory: brand voice", "doc: SOP-42"). */
  read?: string[];
  /** One-sentence prose for the decision. Required — this is the
   *  whole point. Example: "routed to Client Delivery system". */
  decided: string;
  /** Optional list of options Nova considered but didn't pick.
   *  Useful for review surfaces. */
  skipped?: string[];
  /** 0–1 confidence. Rendered as a percent if present. */
  confidence?: number;
};

type Props = {
  data: NovaTraceData;
  /** Compact when collapsed; if false, always renders the full panel.
   *  Default true. */
  collapsible?: boolean;
};

export default function NovaTrace({ data, collapsible = true }: Props) {
  const [open, setOpen] = useState(!collapsible);
  const hasDetail = (data.read && data.read.length > 0) || (data.skipped && data.skipped.length > 0);

  return (
    <div
      className="rounded-lg text-xs font-light"
      style={{
        background: 'rgba(200,242,107,0.05)',
        border: '1px solid rgba(200,242,107,0.15)',
      }}
    >
      <button
        type="button"
        onClick={() => collapsible && hasDetail && setOpen(o => !o)}
        className={`w-full px-3 py-2 flex items-center gap-2 text-left ${hasDetail && collapsible ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span
          aria-hidden
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: '#C8F26B' }}
        />
        <span style={{ color: '#C8F26B' }}>Nova</span>
        <span className="flex-1 truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {data.decided}
        </span>
        {typeof data.confidence === 'number' && (
          <span style={{ color: 'rgba(200,242,107,0.5)' }}>
            {Math.round(data.confidence * 100)}%
          </span>
        )}
        {hasDetail && collapsible && (
          <span aria-hidden className="text-xs" style={{ color: 'rgba(200,242,107,0.4)' }}>
            {open ? '−' : '+'}
          </span>
        )}
      </button>

      {open && hasDetail && (
        <div
          className="px-3 pb-2 pt-1 space-y-1.5"
          style={{ borderTop: '1px solid rgba(200,242,107,0.1)' }}
        >
          {data.read && data.read.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 tracking-[0.12em] uppercase"
                style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', paddingTop: '1px' }}>
                Read
              </span>
              <div className="flex flex-wrap gap-1">
                {data.read.map((r, i) => (
                  <span key={i}
                    className="px-2 py-0.5 rounded"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.55)',
                    }}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.skipped && data.skipped.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 tracking-[0.12em] uppercase"
                style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', paddingTop: '1px' }}>
                Skipped
              </span>
              <div className="flex flex-wrap gap-1">
                {data.skipped.map((s, i) => (
                  <span key={i}
                    className="px-2 py-0.5 rounded line-through"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      color: 'rgba(255,255,255,0.3)',
                    }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
