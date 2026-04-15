/**
 * Weekly Executive Report — "Leadership is flying blind until Friday"
 *
 * Remote-first, timezone-agnostic. Runs every Friday at the boundary
 * where every continent has either finished or not-yet-started their
 * Friday — so the snapshot is the same for everyone who opens it.
 *
 * Structured as an attention-ranked brief: we don't sort by recency,
 * we sort by *delta* — what changed most from the prior week — because
 * remote leaders don't need more information, they need the right
 * information surfaced first.
 */
export const weeklyReportTemplate = {
  schemaVersion: 1 as const,
  slug: 'weekly-exec-brief',
  name: 'Weekly exec brief',
  tagline: 'Friday-morning snapshot built on delta, not recency.',
  description:
    'Every Friday, Nova compares this week to last week across every system, ranks changes by magnitude, and produces a one-page brief that is identical for every timezone. Async-first.',
  version: '1.0.0',
  category: 'operations' as const,
  tags: ['exec', 'weekly', 'remote', 'async', 'attention-ranked'],
  trigger: {
    type: 'schedule' as const,
    cron: '0 12 * * 5', // Friday 12:00 UTC — same snapshot globally
    timezone: 'UTC',
  },
  inputSchema: {
    description: 'Optional focus area for this week, e.g. "retention".',
    example: 'retention',
  },
  stages: [
    {
      id: 'snapshot_now',
      name: 'Snapshot: this week',
      description: 'Pull the last 7 days of signal.',
      instruction:
        'Call list_systems and get_activity to pull every system\'s last 7 days. ' +
        'Return a compact per-system block: name, health delta, top 3 events. Be terse, no prose.',
      dependsOn: [],
      tools: ['list_systems', 'get_activity'],
      tier: 'fast' as const,
      maxTokens: 1500,
      critical: true,
      requiresApproval: false,
    },
    {
      id: 'cross_env',
      name: 'Cross-system analysis',
      description: 'Find second-order patterns across systems.',
      instruction:
        'This week\'s snapshot:\n\n${stages.snapshot_now.output}\n\n' +
        'Call analyse_cross_system to find correlations, dependencies, and feedback loops across systems. ' +
        'Return a short list of the 3 strongest cross-system signals of the week.',
      dependsOn: ['snapshot_now'],
      tools: ['analyse_cross_system'],
      tier: 'deep' as const,
      maxTokens: 1200,
      critical: true,
      requiresApproval: false,
    },
    {
      id: 'rank',
      name: 'Attention ranking',
      description: 'Sort by delta magnitude, not recency.',
      instruction:
        'Given this week\'s snapshot and cross-system signals:\n\n' +
        'SNAPSHOT:\n${stages.snapshot_now.output}\n\n' +
        'CROSS-SYSTEM:\n${stages.cross_env.output}\n\n' +
        'Rank every item by MAGNITUDE OF CHANGE, not by recency. ' +
        'Output exactly 7 items. Each one line: [direction] [system] [delta] [one-line why it matters]. ' +
        'Direction is one of: ↑ improving, ↓ degrading, ⚠ unstable, ★ new.',
      dependsOn: ['snapshot_now', 'cross_env'],
      tools: [],
      tier: 'balanced' as const,
      maxTokens: 800,
      critical: true,
      requiresApproval: false,
    },
    {
      id: 'brief',
      name: 'Write exec brief',
      description: 'One-page, async-friendly brief.',
      instruction:
        'Attention-ranked items for the week:\n\n${stages.rank.output}\n\n' +
        'Optional focus area from the user: ${input}\n\n' +
        'Write a one-page exec brief. Structure:\n' +
        '1. "The week in one sentence" — the single most important truth\n' +
        '2. "Top 3 wins" — what moved forward, with numbers\n' +
        '3. "Top 3 risks" — what is degrading, with recommended action\n' +
        '4. "Decision needed" — one question the team must answer by Monday\n' +
        '5. "What Nova learned" — one sentence on a pattern to reinforce\n\n' +
        'No corporate speak. Written for a human reading on mobile at 7am Saturday.',
      dependsOn: ['rank'],
      tools: [],
      tier: 'deep' as const,
      maxTokens: 1200,
      critical: true,
      requiresApproval: false,
    },
    {
      id: 'learn',
      name: 'Reinforce',
      description: 'Record the week\'s pattern for next time.',
      instruction:
        'Brief produced:\n\n${stages.brief.output}\n\n' +
        'Call record_memory kind="pattern" with a one-sentence observation about what this week revealed ' +
        'that should shape next week\'s brief. This memory will compound over time.',
      dependsOn: ['brief'],
      tools: ['record_memory'],
      tier: 'fast' as const,
      maxTokens: 300,
      critical: false,
      requiresApproval: false,
    },
  ],
};
