'use client';

/**
 * IntegrationCard — the universal primitive for showing "something
 * from a connected tool" anywhere in the app. Used in three places:
 *
 *   1. Nova chat turns (when Nova returns data from an integration)
 *   2. Environment widget grid (when a widget surfaces recent files)
 *   3. Shareable report pages (future — same card, public context)
 *
 * Three states mirror the Apple-home + Notion interaction model the
 * whole product is built on:
 *
 *   Level 0  closed       — single-glance header, icon, metadata, actions
 *   Level 1  peek         — expands in place, shows embed/preview
 *   Level 2  open         — deep-links to native app or web surface
 *
 * The `peek` renderer is provider-specific (lives in components/embeds/)
 * but every card exposes the same three interaction gestures so the
 * chrome stays consistent across 60+ integrations.
 *
 * Design rules (from DESIGN_IDENTITY.md):
 *   - Single accent (brand lime) for primary action
 *   - Chrome edges on hover, no bouncy motion
 *   - Prefers-reduced-motion drops the peek animation
 */

import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

export type IntegrationCardProps = {
  /** Provider id — 'figma' | 'notion' | 'linear' etc. Drives icon + color. */
  provider: string;
  /** Human-readable title — usually the file / issue / channel name. */
  title: string;
  /** One-line metadata below title — "Modified 2 days ago · 12 pages". */
  subtitle?: string;
  /** Optional thumbnail/preview URL (shown as 16:9 band when present). */
  thumbnailUrl?: string;
  /** Deep-link: opens the resource in its native app or web. */
  openUrl?: string;
  /** If set, renders an inline peek state (iframe/preview component). */
  peek?: ReactNode | (() => ReactNode);
  /**
   * Optional lightweight action. If present, shown as a secondary
   * outlined pill next to "Open in X".
   */
  secondaryAction?: { label: string; onClick: () => void };
  /** Optional compact mode for dense grids (smaller padding). */
  compact?: boolean;
};

/** Provider visual identity. Extendable as more integrations land. */
const PROVIDER_META: Record<string, { label: string; color: string; glyph: string }> = {
  figma: { label: 'Figma', color: '#ff7262', glyph: '◐' },
  notion: { label: 'Notion', color: '#FFFFFF', glyph: '◆' },
  linear: { label: 'Linear', color: '#5e6ad2', glyph: '◉' },
  slack: { label: 'Slack', color: '#4A154B', glyph: '◇' },
  github: { label: 'GitHub', color: '#FFFFFF', glyph: '◓' },
  stripe: { label: 'Stripe', color: '#635bff', glyph: '◑' },
  hubspot: { label: 'HubSpot', color: '#fe4a49', glyph: '◒' },
  google_calendar: { label: 'Google Calendar', color: '#4285f4', glyph: '◰' },
  google_drive: { label: 'Google Drive', color: '#0f9d58', glyph: '◱' },
  google_workspace: { label: 'Google', color: '#4285f4', glyph: '◰' },
  meta_ads: { label: 'Meta Ads', color: '#1877F2', glyph: '◔' },
  shopify: { label: 'Shopify', color: '#96bf48', glyph: '◕' },
  salesforce: { label: 'Salesforce', color: '#00a1e0', glyph: '⬒' },
  cloudflare: { label: 'Cloudflare', color: '#F38020', glyph: '⬓' },
  airtable: { label: 'Airtable', color: '#FCB400', glyph: '◈' },
};

function providerOf(p: string) {
  return PROVIDER_META[p] ?? {
    label: p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    color: 'rgba(255,255,255,0.5)',
    glyph: '◌',
  };
}

export default function IntegrationCard({
  provider,
  title,
  subtitle,
  thumbnailUrl,
  openUrl,
  peek,
  secondaryAction,
  compact = false,
}: IntegrationCardProps) {
  const [peeking, setPeeking] = useState(false);
  const peekRef = useRef<HTMLDivElement | null>(null);
  const meta = providerOf(provider);

  const togglePeek = useCallback(() => {
    setPeeking(v => !v);
  }, []);

  // Smooth scroll the peek into view when it opens — small UX nicety so
  // the preview doesn't open below the fold on long chat transcripts.
  useEffect(() => {
    if (peeking && peekRef.current) {
      peekRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [peeking]);

  const peekContent = typeof peek === 'function' ? peek() : peek;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Optional thumbnail — always present if Nova fetched one so the
          card reads as "a real thing" rather than an abstract reference. */}
      {thumbnailUrl && !peeking && (
        <div
          className="w-full aspect-[16/9] bg-center bg-cover"
          style={{
            backgroundImage: `url(${thumbnailUrl})`,
            backgroundColor: 'rgba(255,255,255,0.02)',
          }}
          aria-hidden
        />
      )}

      {/* Header — provider icon + title + subtitle. Always visible. */}
      <div className={compact ? 'px-3.5 py-3' : 'px-4 py-3.5'}>
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--glass-border)',
              color: meta.color,
            }}
            aria-hidden
          >
            {meta.glyph}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[10px] tracking-[0.12em] uppercase font-light" style={{ color: 'var(--text-3)' }}>
                {meta.label}
              </span>
              {subtitle && (
                <span className="text-[10px] font-light" style={{ color: 'var(--text-4)' }}>
                  ·
                </span>
              )}
              {subtitle && (
                <span className="text-[11px] font-light truncate" style={{ color: 'var(--text-3)' }}>
                  {subtitle}
                </span>
              )}
            </div>
            <p
              className="text-sm font-light mt-0.5 leading-snug"
              style={{ color: 'var(--text-1)' }}
              title={title}
            >
              {title}
            </p>
          </div>
        </div>

        {/* Actions row — peek / open / secondary. Shown on every card. */}
        {(peek || openUrl || secondaryAction) && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {peek && (
              <button
                onClick={togglePeek}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-light transition-all"
                style={{
                  background: peeking ? 'var(--brand-soft)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${peeking ? 'var(--brand-border)' : 'var(--glass-border)'}`,
                  color: peeking ? 'var(--brand)' : 'var(--text-2)',
                }}
                aria-expanded={peeking}
              >
                {peeking ? 'Hide peek' : 'Peek'}
                <span aria-hidden>{peeking ? '▾' : '▸'}</span>
              </button>
            )}
            {openUrl && (
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-light transition-all hover:brightness-110"
                style={{
                  background: 'var(--brand-soft)',
                  border: '1px solid var(--brand-border)',
                  color: 'var(--brand)',
                }}
              >
                Open in {meta.label} <span aria-hidden>↗</span>
              </a>
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-light transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-2)',
                }}
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Peek — provider-specific embed renderer, animated open */}
      {peeking && peek && (
        <div
          ref={peekRef}
          className="border-t animate-fade-in"
          style={{ borderColor: 'var(--glass-border)' }}
        >
          {peekContent}
        </div>
      )}
    </div>
  );
}

/**
 * IntegrationCardList — compact grid renderer when Nova returns
 * multiple cards (e.g., "list your recent Figma files"). Keeps the
 * chat transcript scannable: one header row + stacked mini-cards.
 */
export function IntegrationCardList({
  title,
  cards,
}: {
  title?: string;
  cards: IntegrationCardProps[];
}) {
  if (cards.length === 0) return null;
  return (
    <div className="space-y-2">
      {title && (
        <p className="text-[10px] tracking-[0.14em] uppercase font-light" style={{ color: 'var(--text-3)' }}>
          {title} · {cards.length}
        </p>
      )}
      <div className="grid grid-cols-1 gap-2">
        {cards.map((c, i) => (
          <IntegrationCard key={`${c.provider}-${i}`} {...c} compact />
        ))}
      </div>
    </div>
  );
}
