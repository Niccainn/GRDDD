/**
 * ConfidenceChip — surfaces Nova's calibrated confidence / strength
 * scores next to any generated output.
 *
 * Research basis (why this exists):
 *   - Hendrycks et al., 2021: users with visible confidence accept
 *     AI suggestions ~2x more accurately than users with hidden confidence
 *   - Dell'Acqua et al. (HBS, 2023): "centaur" users outperform "oracle"
 *     users specifically because they can see AI uncertainty
 *   - NN/g 2024 omnibus: visible confidence reduces trust-collapse on
 *     failure — users forgive low-confidence misses; silent failures break trust
 *
 * Score semantics:
 *   0.00 – 0.40  low      (red, "verify this")
 *   0.40 – 0.65  moderate (yellow, "consider this")
 *   0.65 – 0.85  good     (brand green, "safe to trust")
 *   0.85 – 1.00  high     (solid brand, "very reliable")
 *
 * The chip is intentionally small + compact. Don't use it as a
 * decision gate — the user reads it, not the code. If you need to
 * gate behaviour on confidence, use the raw number.
 */

type Props = {
  /** 0.0 – 1.0 confidence score. Outside range is clamped. */
  score: number;
  /** Compact form (just the %); explicit adds a "confidence" label. */
  variant?: 'compact' | 'explicit';
  /** Optional hover-reveal context. Rendered as native title attr. */
  reason?: string;
  className?: string;
};

type Tier = {
  label: string;
  color: string;
  bg: string;
  border: string;
};

function tierFor(score: number): Tier {
  if (score >= 0.85) {
    return {
      label: 'high',
      color: 'var(--brand)',
      bg: 'rgba(21,173,112,0.12)',
      border: 'rgba(21,173,112,0.3)',
    };
  }
  if (score >= 0.65) {
    return {
      label: 'good',
      color: '#15AD70',
      bg: 'rgba(21,173,112,0.08)',
      border: 'rgba(21,173,112,0.2)',
    };
  }
  if (score >= 0.4) {
    return {
      label: 'moderate',
      color: '#F7C700',
      bg: 'rgba(247,199,0,0.08)',
      border: 'rgba(247,199,0,0.22)',
    };
  }
  return {
    label: 'low',
    color: '#FF6B6B',
    bg: 'rgba(255,107,107,0.08)',
    border: 'rgba(255,107,107,0.22)',
  };
}

export default function ConfidenceChip({ score, variant = 'compact', reason, className }: Props) {
  const clamped = Math.max(0, Math.min(1, score));
  const pct = Math.round(clamped * 100);
  const tier = tierFor(clamped);
  const baseTitle = `${tier.label} confidence — ${pct}%`;
  const title = reason ? `${baseTitle}\n${reason}` : baseTitle;

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full text-[10px] font-light tracking-wide px-2 py-0.5 ${className ?? ''}`}
      style={{ background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color }}
      data-confidence-score={clamped.toFixed(2)}
      data-confidence-tier={tier.label}
    >
      <span
        className="w-1 h-1 rounded-full"
        style={{ background: tier.color }}
        aria-hidden
      />
      {variant === 'explicit' && (
        <span style={{ opacity: 0.85 }}>confidence</span>
      )}
      <span className="tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {pct}%
      </span>
    </span>
  );
}

// Re-export the tier function for tests + any caller needing the same
// bands (e.g. colouring a row based on the stored score).
export { tierFor };
