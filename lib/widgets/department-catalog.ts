/**
 * Department widget catalog.
 *
 * Maps each department (brand, marketing, ops, finance, design, dev)
 * to a list of preset widget cards users can toggle on/off during
 * onboarding, and later add/remove from their Environment page.
 *
 * A preset is an abstract recommendation — title, subtitle, icon,
 * and the panel ID the System page uses to conditionally render the
 * matching hardcoded section or to mount a spec-driven widget.
 *
 * Panel IDs prefixed `core:` map to hardcoded right-side panels on
 * /systems/[id]. IDs prefixed `widget:` map to WidgetSpecs that the
 * canvas engine renders.
 *
 * Source of truth: this file. The onboarding picker reads from here;
 * the System page reads from here too so a new preset appears in
 * both surfaces without wiring two places.
 */

export type DepartmentId =
  | 'brand'
  | 'marketing'
  | 'operations'
  | 'finance'
  | 'design'
  | 'development'
  | 'general';

export type WidgetPreset = {
  id: string;
  title: string;
  subtitle: string;
  /** One-line pitch shown under the title in the picker. */
  rationale: string;
  /** Default state when a user first sees this preset. */
  recommended: boolean;
  /** Lightweight lucide-style glyph keyword; rendered as a small mark. */
  glyph:
    | 'dot'
    | 'chart'
    | 'feed'
    | 'target'
    | 'spark'
    | 'brain'
    | 'inbox'
    | 'scale'
    | 'compass'
    | 'sun';
  /** Accent color for the preset tile. */
  color: string;
};

export type Department = {
  id: DepartmentId;
  name: string;
  tagline: string;
  presets: WidgetPreset[];
};

/**
 * Universal presets — available to every department. These map 1:1 to
 * the hardcoded panels on the System page (core:*) so toggling them
 * off actually hides the panel.
 */
const UNIVERSAL_PRESETS: WidgetPreset[] = [
  {
    id: 'core:details',
    title: 'Details',
    subtitle: 'Workflows, creator, health',
    rationale: 'The quick facts card at the top of the right rail.',
    recommended: true,
    glyph: 'dot',
    color: '#8B9AA8',
  },
  {
    id: 'core:goals',
    title: 'Goals',
    subtitle: 'Progress bars tied to this system',
    rationale: 'Every widget should trace back to a goal; this is that thread.',
    recommended: true,
    glyph: 'target',
    color: '#C8F26B',
  },
  {
    id: 'core:nova-memory',
    title: 'Nova memory',
    subtitle: 'What Nova remembers about this system',
    rationale: 'Shows the context Nova uses. Turning this off hides the memory panel.',
    recommended: true,
    glyph: 'brain',
    color: '#BF9FF1',
  },
  {
    id: 'core:context-docs',
    title: 'Context docs',
    subtitle: 'Reference material Nova reads',
    rationale: 'Upload SOPs, style guides, anything Nova should ground answers in.',
    recommended: true,
    glyph: 'feed',
    color: '#7193ED',
  },
  {
    id: 'core:execution-chart',
    title: 'Execution chart',
    subtitle: '30-day run history',
    rationale: 'How often this system actually runs and whether it succeeds.',
    recommended: true,
    glyph: 'chart',
    color: '#E879F9',
  },
  {
    id: 'core:integrations',
    title: 'Connected integrations',
    subtitle: 'Tools feeding this system',
    rationale: 'Which external tools the system can read from and write to.',
    recommended: true,
    glyph: 'compass',
    color: '#6395FF',
  },
  {
    id: 'widget:weekly-narrative',
    title: 'Weekly narrative',
    subtitle: 'Nova-written Monday recap',
    rationale: 'Five sentences that read like a CEO briefing — the thing that gets forwarded.',
    recommended: true,
    glyph: 'sun',
    color: '#F5D76E',
  },
  {
    id: 'widget:action-ledger',
    title: 'Action ledger',
    subtitle: 'Last 20 things Nova did here',
    rationale: 'The trust layer made visible: what was decided, skipped, or waiting.',
    recommended: false,
    glyph: 'scale',
    color: '#A878FF',
  },
  {
    id: 'widget:exceptions',
    title: 'Exceptions feed',
    subtitle: "What's blocked, ranked by cost",
    rationale: 'An ops-minded view of where attention is needed — not a task list.',
    recommended: false,
    glyph: 'inbox',
    color: '#FF8C69',
  },
];

/**
 * Department-specific presets. Each is a placeholder widget concept;
 * they appear in the picker and on the system page as an "up next"
 * tile until the full widget ships. This lets onboarding feel
 * complete even while the full widget catalog is being built out.
 */
export const DEPARTMENTS: Department[] = [
  {
    id: 'brand',
    name: 'Brand',
    tagline: 'Voice, guidelines, consistency',
    presets: [
      ...UNIVERSAL_PRESETS,
      {
        id: 'widget:voice-drift',
        title: 'Voice drift meter',
        subtitle: 'How outbound copy compares to your tone guide',
        rationale: 'Catches brand entropy before it shows up in a customer complaint.',
        recommended: true,
        glyph: 'spark',
        color: '#C8F26B',
      },
      {
        id: 'widget:competitor-voice',
        title: 'Competitor voice tracker',
        subtitle: 'How your voice differs from 5 competitors',
        rationale: 'Weekly score — the slide brand leads paste into every QBR.',
        recommended: false,
        glyph: 'chart',
        color: '#E879F9',
      },
      {
        id: 'widget:asset-shelf',
        title: 'Canonical asset shelf',
        subtitle: 'Current logo, colors, templates',
        rationale: "Kills 'where's the latest logo' Slack threads.",
        recommended: true,
        glyph: 'dot',
        color: '#BF9FF1',
      },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    tagline: 'Funnel, campaigns, retention',
    presets: [
      ...UNIVERSAL_PRESETS,
      {
        id: 'widget:unified-funnel',
        title: 'Unified funnel',
        subtitle: 'Cold → visitors → signups → activated → revenue',
        rationale: 'One number stack so nobody argues about which tool is right.',
        recommended: true,
        glyph: 'chart',
        color: '#6395FF',
      },
      {
        id: 'widget:campaign-roas',
        title: 'Campaign ROAS',
        subtitle: 'Live $ in vs $ out with confidence bands',
        rationale: 'Point estimates poisoned trust; ranges restore it.',
        recommended: true,
        glyph: 'target',
        color: '#C8F26B',
      },
      {
        id: 'widget:spike-explainer',
        title: 'Spike explainer',
        subtitle: 'Why did this metric move?',
        rationale: 'When a number jumps, Nova writes the one-paragraph story.',
        recommended: false,
        glyph: 'spark',
        color: '#F5D76E',
      },
    ],
  },
  {
    id: 'operations',
    name: 'Operations',
    tagline: 'Exceptions, cycle time, process health',
    presets: [
      ...UNIVERSAL_PRESETS,
      {
        id: 'widget:cycle-time',
        title: 'Cycle time per process',
        subtitle: 'Median + p90 + week-over-week',
        rationale: 'A shrinking p90 is the best ops metric that exists.',
        recommended: true,
        glyph: 'chart',
        color: '#7193ED',
      },
      {
        id: 'widget:vendor-sla',
        title: 'Vendor SLA board',
        subtitle: 'Contracts, renewals, SLA hits',
        rationale: 'Prevents six-figure auto-renewals from sliding by.',
        recommended: false,
        glyph: 'scale',
        color: '#BF9FF1',
      },
      {
        id: 'widget:process-health',
        title: 'Process health map',
        subtitle: 'Workflow volume × success × drift',
        rationale: 'Rising drift = the workflow is out of date with reality.',
        recommended: true,
        glyph: 'compass',
        color: '#E879F9',
      },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    tagline: 'Runway, cash, variance',
    presets: [
      ...UNIVERSAL_PRESETS,
      {
        id: 'widget:runway',
        title: 'Runway',
        subtitle: 'Months remaining + burn multiple',
        rationale: 'The one number the CEO will ask about.',
        recommended: true,
        glyph: 'target',
        color: '#C8F26B',
      },
      {
        id: 'widget:cash-waterfall',
        title: 'Cash waterfall',
        subtitle: 'Opening → in → out → closing',
        rationale: 'Operators read waterfalls; P&Ls are for investors.',
        recommended: true,
        glyph: 'chart',
        color: '#6395FF',
      },
      {
        id: 'widget:variance-commentary',
        title: 'Variance commentary',
        subtitle: 'Nova explains every budget miss',
        rationale: 'Turns the monthly close from reporting into thinking.',
        recommended: false,
        glyph: 'spark',
        color: '#F5D76E',
      },
      {
        id: 'widget:investor-update',
        title: 'Investor update draft',
        subtitle: 'Monthly email pre-composed',
        rationale: 'The update founders always mean to write and never do.',
        recommended: false,
        glyph: 'feed',
        color: '#BF9FF1',
      },
    ],
  },
  {
    id: 'design',
    name: 'Design',
    tagline: 'System adoption, accessibility, journeys',
    presets: [
      ...UNIVERSAL_PRESETS,
      {
        id: 'widget:component-coverage',
        title: 'Component coverage',
        subtitle: '% of shipped UI using design-system primitives',
        rationale: 'The single best indicator of design-eng health.',
        recommended: true,
        glyph: 'chart',
        color: '#7193ED',
      },
      {
        id: 'widget:a11y-score',
        title: 'Accessibility score',
        subtitle: 'WCAG pass/fail per surface',
        rationale: 'Forces the conversation design teams always skip.',
        recommended: true,
        glyph: 'target',
        color: '#C8F26B',
      },
      {
        id: 'widget:design-ship-latency',
        title: 'Design → ship latency',
        subtitle: 'Figma signoff to production',
        rationale: 'Separates design teams that influence from teams that deliver mockups.',
        recommended: false,
        glyph: 'spark',
        color: '#E879F9',
      },
    ],
  },
  {
    id: 'development',
    name: 'Development',
    tagline: 'Velocity, reliability, AI-native',
    presets: [
      ...UNIVERSAL_PRESETS,
      {
        id: 'widget:shipping-velocity',
        title: 'Shipping velocity',
        subtitle: 'PRs merged × lead time × deploy rate',
        rationale: 'Commits are noise; shipped work is signal.',
        recommended: true,
        glyph: 'chart',
        color: '#6395FF',
      },
      {
        id: 'widget:review-bottleneck',
        title: 'Review bottleneck',
        subtitle: 'Open PRs × time-in-review × reviewer load',
        rationale: 'Cutting review latency is the highest-leverage eng fix.',
        recommended: true,
        glyph: 'inbox',
        color: '#F5D76E',
      },
      {
        id: 'widget:ai-acceptance',
        title: 'AI codegen acceptance',
        subtitle: 'Nova + Claude Code PR acceptance rate',
        rationale: 'The north-star metric of the AI-native engineering org.',
        recommended: true,
        glyph: 'brain',
        color: '#BF9FF1',
      },
      {
        id: 'widget:on-call-health',
        title: 'On-call health',
        subtitle: 'Pager load, MTTR, burnout signals',
        rationale: 'Prevents the thing that makes good engineers quit.',
        recommended: false,
        glyph: 'sun',
        color: '#FF8C69',
      },
    ],
  },
  {
    id: 'general',
    name: 'General',
    tagline: 'Universal starter set',
    presets: UNIVERSAL_PRESETS,
  },
];

export function getDepartment(id: DepartmentId): Department {
  return DEPARTMENTS.find(d => d.id === id) ?? DEPARTMENTS[DEPARTMENTS.length - 1];
}

/**
 * localStorage key used by both the onboarding picker and the System
 * page. Value is a JSON string array of preset IDs the user has
 * explicitly HIDDEN on this system. Missing key = show defaults.
 */
export function hiddenPresetsKey(systemId: string): string {
  return `grid:hidden-panels:${systemId}`;
}

export function readHiddenPresets(systemId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(hiddenPresetsKey(systemId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function writeHiddenPresets(systemId: string, hidden: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(hiddenPresetsKey(systemId), JSON.stringify([...hidden]));
    window.dispatchEvent(new CustomEvent('grid:hidden-panels-changed', { detail: { systemId } }));
  } catch {
    /* quota exceeded or private mode — non-fatal */
  }
}
