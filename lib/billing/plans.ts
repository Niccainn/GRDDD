// Plan definitions — no external dependencies, safe for client import.
//
// Internal IDs are FREE / PRO / TEAM and are persisted on
// Subscription.plan; flipping the ID would require a DB migration AND
// new Stripe Price IDs, so we keep the IDs stable and only rename the
// USER-VISIBLE labels to match the marketing page:
//
//   FREE → "Operator"     (solo, BYOK)
//   PRO  → "Team"         (3–20 person teams, $29/seat/mo)
//   TEAM → "Enterprise"   (50+ person orgs, custom contract)
//
// Any UI surface that shows a plan name should read PLANS[id].name —
// hardcoding "Pro" / "Team" anywhere will drift out of sync.

export type PlanType = 'FREE' | 'PRO' | 'TEAM';

export type PlanLimits = {
  environments: number;
  systems: number;
  executions: number;
  nova_queries: number;
  api_keys: number;
};

export type PlanFeature =
  | 'team_members'
  | 'audit_log'
  | 'priority_support'
  | 'unlimited_systems'
  | 'unlimited_environments';

export type PlanDefinition = {
  id: PlanType;
  name: string;
  description: string;
  price: number; // monthly USD (per seat for ENTERPRISE)
  priceSuffix: string;
  /** Display override for the headline price chip — used when the
   *  numeric price isn't the right answer (e.g. Enterprise renders
   *  "Contract" instead of "$N"). When null, UI falls back to
   *  formatting `price` + `priceSuffix`. */
  priceDisplay?: { amount: string; suffix: string };
  limits: PlanLimits;
  features: PlanFeature[];
  highlight?: boolean;
};

export const PLANS: Record<PlanType, PlanDefinition> = {
  FREE: {
    id: 'FREE',
    name: 'Operator',
    description: 'Solo operator running their own ops — BYOK Anthropic',
    price: 0,
    priceSuffix: '/mo',
    priceDisplay: { amount: '$0', suffix: '/mo · BYOK' },
    limits: {
      environments: 3,
      systems: 5,
      executions: 100,
      nova_queries: 50,
      api_keys: 1,
    },
    features: [],
  },
  PRO: {
    id: 'PRO',
    name: 'Team',
    description: '3–20 person teams running real projects',
    price: 29,
    priceSuffix: '/seat/mo',
    priceDisplay: { amount: '$29', suffix: '/seat/mo' },
    limits: {
      environments: 10,
      systems: Infinity,
      executions: 2000,
      nova_queries: 500,
      api_keys: 10,
    },
    features: ['unlimited_systems'],
    highlight: true,
  },
  TEAM: {
    id: 'TEAM',
    name: 'Enterprise',
    description: '50+ person orgs, regulated industries — custom contract',
    price: 79,
    priceSuffix: '/seat/mo',
    // Marketing page advertises Enterprise as "Contract" pricing.
    // The numeric `price: 79` stays as the Stripe-side default for any
    // self-serve checkout that bypasses sales, but the comparison
    // grid renders "Contract" so the visible funnel matches /pricing.
    priceDisplay: { amount: 'Contract', suffix: '' },
    limits: {
      environments: Infinity,
      systems: Infinity,
      executions: 10000,
      nova_queries: 2000,
      api_keys: 50,
    },
    features: [
      'unlimited_systems',
      'unlimited_environments',
      'team_members',
      'audit_log',
      'priority_support',
    ],
  },
};

export const PLAN_ORDER: PlanType[] = ['FREE', 'PRO', 'TEAM'];

export function getPlanLimits(plan: PlanType): PlanLimits {
  return PLANS[plan].limits;
}

export function isFeatureAvailable(plan: PlanType, feature: PlanFeature): boolean {
  return PLANS[plan].features.includes(feature);
}

export function getPlanByStripePriceId(priceId: string): PlanType | null {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'PRO';
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return 'TEAM';
  return null;
}

/** Human-readable label for a usage metric */
export const METRIC_LABELS: Record<string, string> = {
  executions: 'Executions',
  nova_queries: 'Atrium queries',
  api_calls: 'API calls',
  storage_mb: 'Storage (MB)',
};
