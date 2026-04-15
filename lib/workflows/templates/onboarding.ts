/**
 * Customer Onboarding — "New customers fall through the cracks"
 *
 * Fired by a webhook when a new customer signs up. Nova researches
 * them, drafts a personalized welcome, plans their first-week journey,
 * and creates the tracking goals & signals so nothing is dropped.
 */
export const onboardingTemplate = {
  schemaVersion: 1 as const,
  slug: 'customer-onboarding',
  name: 'Customer onboarding',
  tagline: 'Every new customer gets the white-glove treatment — automatically.',
  description:
    'Triggers on a signup webhook. Researches the customer, drafts a personal welcome, creates a first-week plan, and wires up the tracking signals so the team sees drop-off before it happens.',
  version: '1.0.0',
  category: 'operations' as const,
  tags: ['customer', 'lifecycle', 'webhook', 'synergy'],
  trigger: {
    type: 'webhook' as const,
    path: 'customer-signup',
  },
  inputSchema: {
    description: 'JSON with { name, email, company?, plan? }',
    example: '{"name":"Jane Doe","email":"jane@acme.com","company":"Acme","plan":"pro"}',
  },
  stages: [
    {
      id: 'research',
      name: 'Research customer',
      description: 'Build a one-paragraph profile from the signup payload.',
      instruction:
        'A new customer just signed up. Raw payload:\n\n${input}\n\n' +
        'Write a one-paragraph profile: who they are, likely use case, a hypothesis about why they chose us, ' +
        'and any risks of churn. Use ONLY what is in the payload — do not invent facts.',
      dependsOn: [],
      tools: [],
      tier: 'balanced' as const,
      maxTokens: 500,
      critical: true,
      requiresApproval: false,
    },
    {
      id: 'welcome',
      name: 'Draft welcome',
      description: 'Personal welcome message ready for review.',
      instruction:
        'Based on this profile:\n\n${stages.research.output}\n\n' +
        'Draft a 3-sentence welcome message. Warm, human, specific to their hypothesized use case. ' +
        'No templates. No "excited to have you". End with ONE concrete first-step suggestion.',
      dependsOn: ['research'],
      tools: [],
      tier: 'balanced' as const,
      maxTokens: 400,
      critical: true,
      requiresApproval: true, // human approves the outgoing message
    },
    {
      id: 'plan',
      name: 'First-week plan',
      description: 'Day-by-day milestones for the customer.',
      instruction:
        'Profile:\n${stages.research.output}\n\n' +
        'Create a day-by-day first-week plan for this customer (days 1–7). ' +
        'Each day should have one primary milestone and one signal we can measure to know if it worked. ' +
        'Format as a markdown table.',
      dependsOn: ['research'],
      tools: [],
      tier: 'balanced' as const,
      maxTokens: 900,
      critical: true,
      requiresApproval: false,
    },
    {
      id: 'instrument',
      name: 'Wire up tracking',
      description: 'Create goals + activation signal so dropoff is visible.',
      instruction:
        'Create tracking infrastructure for this customer based on the plan:\n\n${stages.plan.output}\n\n' +
        'Call list_goals first to avoid duplicates. Then create ONE goal for "Activate in first 7 days" ' +
        'and ONE signal with source="onboarding" priority="HIGH" describing the new customer. ' +
        'Finally call record_memory kind="outcome" noting what plan was generated so future onboardings can learn from it.',
      dependsOn: ['plan'],
      tools: ['list_goals', 'update_goal', 'create_signal', 'record_memory'],
      tier: 'balanced' as const,
      maxTokens: 800,
      critical: false,
      requiresApproval: false,
    },
  ],
};
