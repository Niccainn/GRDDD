/**
 * AutonomyBadge — visible constraint marker for SystemAgent outputs.
 *
 * Research basis: Anthropic's Constitutional AI + subsequent alignment
 * work consistently find that trust increases when the AI's
 * constraints are visible to the user. Hiding an agent's limits makes
 * users over-trust it; surfacing the tier they're operating at makes
 * users calibrate accurately.
 *
 * Used next to any surface where a system agent is acting:
 *   - System detail pages
 *   - Workflow execution traces
 *   - Scaffold review (per-system agent proposals)
 *
 * Tiers map 1:1 to the AutonomyConfig semantics in the schema.
 */

type Tier = 'Observe' | 'Suggest' | 'Act' | 'Autonomous' | 'Self-Direct';

type Props = {
  tier: Tier;
  /** Show "Observe only" / "Suggesting" / "Acting" natural phrasing instead of raw tier label. */
  phrasing?: 'tier' | 'natural';
  className?: string;
};

type Meta = {
  label: string;
  naturalLabel: string;
  color: string;
  bg: string;
  border: string;
  /** Tooltip: what this tier can and cannot do. */
  explainer: string;
};

const TIER_META: Record<Tier, Meta> = {
  Observe: {
    label: 'Observe',
    naturalLabel: 'Observe only',
    color: 'rgba(255,255,255,0.55)',
    bg: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.1)',
    explainer: 'Reads but does not act. No writes, no sends, no side effects.',
  },
  Suggest: {
    label: 'Suggest',
    naturalLabel: 'Suggesting',
    color: '#7193ED',
    bg: 'rgba(113,147,237,0.1)',
    border: 'rgba(113,147,237,0.25)',
    explainer: 'Drafts and proposes — you approve before anything leaves Grid.',
  },
  Act: {
    label: 'Act',
    naturalLabel: 'Acting on your behalf',
    color: '#15AD70',
    bg: 'rgba(21,173,112,0.1)',
    border: 'rgba(21,173,112,0.25)',
    explainer: 'Acts within its tool allow-list. You are notified after each action.',
  },
  Autonomous: {
    label: 'Autonomous',
    naturalLabel: 'Running autonomously',
    color: '#BF9FF1',
    bg: 'rgba(191,159,241,0.1)',
    border: 'rgba(191,159,241,0.25)',
    explainer: 'Executes multi-step workflows without per-step approval. Review log after the fact.',
  },
  'Self-Direct': {
    label: 'Self-Direct',
    naturalLabel: 'Self-directing',
    color: '#F7C700',
    bg: 'rgba(247,199,0,0.1)',
    border: 'rgba(247,199,0,0.25)',
    explainer: 'Chooses its own tasks within the system scope. Highest autonomy — use with care.',
  },
};

export default function AutonomyBadge({ tier, phrasing = 'tier', className }: Props) {
  const meta = TIER_META[tier];
  if (!meta) return null;

  return (
    <span
      title={meta.explainer}
      data-autonomy-tier={tier}
      className={`inline-flex items-center gap-1.5 rounded-full text-[10px] font-light tracking-wide px-2 py-0.5 ${className ?? ''}`}
      style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}
    >
      <span className="w-1 h-1 rounded-full" style={{ background: meta.color }} aria-hidden />
      {phrasing === 'natural' ? meta.naturalLabel : meta.label}
    </span>
  );
}

export { TIER_META };
export type { Tier as AutonomyTier };
