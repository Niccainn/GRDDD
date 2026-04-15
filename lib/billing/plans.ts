// Plan definitions — no external dependencies, safe for client import.

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
  price: number; // monthly USD (per seat for TEAM)
  priceSuffix: string;
  limits: PlanLimits;
  features: PlanFeature[];
  highlight?: boolean;
};

export const PLANS: Record<PlanType, PlanDefinition> = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    description: 'For individuals getting started',
    price: 0,
    priceSuffix: '/mo',
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
    name: 'Pro',
    description: 'For professionals scaling their workflows',
    price: 29,
    priceSuffix: '/mo',
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
    name: 'Team',
    description: 'For teams that need full control',
    price: 79,
    priceSuffix: '/seat/mo',
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
  nova_queries: 'Nova queries',
  api_calls: 'API calls',
  storage_mb: 'Storage (MB)',
};
