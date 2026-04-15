/**
 * Daily Standup — "Nobody knows what anyone is doing"
 *
 * Every weekday morning, Nova scans yesterday's activity across all
 * systems, clusters it into themes, drafts a one-screen digest, and
 * proposes what matters today. Humans react; the system learns what
 * they actually cared about via record_memory.
 */
export const standupTemplate = {
  schemaVersion: 1 as const,
  slug: 'daily-standup',
  name: 'Daily standup',
  tagline: 'Nobody reads yours. Nova makes one that people actually do.',
  description:
    'Scans yesterday across every system, surfaces the signals that matter, and proposes the top three moves for today. Posts to the team and learns from what they react to.',
  version: '1.0.0',
  category: 'operations' as const,
  tags: ['team', 'morning', 'async', 'synergy'],
  trigger: {
    type: 'schedule' as const,
    cron: '0 14 * * 1-5', // 9am ET weekdays (14:00 UTC)
    timezone: 'America/New_York',
  },
  inputSchema: {
    description: 'Ignored — scheduled runs pull yesterday automatically.',
    example: '',
  },
  stages: [
    {
      id: 'scan',
      name: 'Scan yesterday',
      description: 'Pull the last 24h of activity across every system.',
      instruction:
        'Use get_activity to pull the last 24 hours of activity across ALL systems. ' +
        'Return a raw bullet list of every meaningful event — do not filter or summarize yet. ' +
        'Group bullets by system name.',
      dependsOn: [],
      tools: ['list_systems', 'get_activity'],
      tier: 'fast' as const,
      maxTokens: 1500,
      critical: true,
      requiresApproval: false,
    },
    {
      id: 'cluster',
      name: 'Find themes',
      description: 'Cluster raw events into 3–5 themes.',
      instruction:
        'You are given yesterday\'s raw activity below.\n\n${stages.scan.output}\n\n' +
        'Cluster this into 3–5 coherent themes. For each theme: name it, list the 2–4 strongest signals, ' +
        'and flag anything that looks like a blocker or an emerging risk. Be terse.',
      dependsOn: ['scan'],
      tools: [],
      tier: 'balanced' as const,
      maxTokens: 1500,
      critical: true,
      requiresApproval: false,
    },
    {
      id: 'digest',
      name: 'Write digest',
      description: 'Compose a one-screen morning digest.',
      instruction:
        'Write a morning standup digest based on these themes:\n\n${stages.cluster.output}\n\n' +
        'Format: ≤180 words. Three sections: "What shipped", "What is blocked", "Top 3 for today". ' +
        'Bullet points, no fluff, no "synergize". Use plain language.',
      dependsOn: ['cluster'],
      tools: [],
      tier: 'balanced' as const,
      maxTokens: 800,
      critical: true,
      requiresApproval: false,
    },
    {
      id: 'learn',
      name: 'Reinforce learning',
      description: 'Record what Nova noticed so future runs improve.',
      instruction:
        'Below is the digest you produced:\n\n${stages.digest.output}\n\n' +
        'Call record_memory ONCE with kind="pattern" to capture what the team seems to care about ' +
        'based on the themes you identified. Be specific — this note will be used to tune future standups.',
      dependsOn: ['digest'],
      tools: ['record_memory'],
      tier: 'fast' as const,
      maxTokens: 400,
      critical: false,
      requiresApproval: false,
    },
  ],
};
