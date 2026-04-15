/**
 * Problem Radar — "We only find problems after they hurt"
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  THIS IS THE SYNERGY PRIMITIVE.                          │
 *   │                                                          │
 *   │  The problem with every "AI work OS" today is that the   │
 *   │  human is the BOTTLENECK — everything routes through a   │
 *   │  meeting, a Slack thread, or a weekly review before      │
 *   │  anyone sees a problem.                                  │
 *   │                                                          │
 *   │  Problem Radar inverts this. It runs autonomously on a   │
 *   │  schedule, scans every system with algorithmic attention │
 *   │  ranking (delta + novelty + recurrence), and proposes    │
 *   │  what is WRONG — not what is happening. Humans react by  │
 *   │  confirming, rejecting, or reprioritizing findings. Each │
 *   │  human action is captured as a record_memory call with   │
 *   │  an explicit "reinforcement signal" the next run reads.  │
 *   │                                                          │
 *   │  That's the Bayesian loop that makes the system get      │
 *   │  smarter every single week: every human reaction is a    │
 *   │  labelled training signal for the NEXT problem scan.     │
 *   │                                                          │
 *   │  This is how GRID compounds into institutional           │
 *   │  intelligence. This is the template a VC should see.     │
 *   └──────────────────────────────────────────────────────────┘
 */
export const problemRadarTemplate = {
  schemaVersion: 1 as const,
  slug: 'problem-radar',
  name: 'Problem radar',
  tagline:
    'Finds what is wrong before anyone notices — and gets smarter every time a human reacts.',
  description:
    'Autonomous problem-finder. Scans every system for friction, novelty, and recurring failure patterns, ranks them by impact, and posts a prioritized radar. Every human reaction is captured as a learning signal so next week\'s scan is better than this week\'s. The feedback loop IS the product.',
  version: '1.0.0',
  category: 'operations' as const,
  tags: ['radar', 'synergy', 'learning', 'rlhf', 'async', 'remote'],
  trigger: {
    type: 'schedule' as const,
    cron: '0 13 * * 1,4', // Mon + Thu 13:00 UTC — twice-weekly rhythm
    timezone: 'UTC',
  },
  inputSchema: {
    description: 'Optional: restrict scan to a specific system or concern.',
    example: 'retention',
  },
  stages: [
    {
      id: 'recall',
      name: 'Recall prior signals',
      description: 'Pull learned patterns from past human reactions.',
      instruction:
        'Before scanning, recall what we have learned from prior problem-radar runs. ' +
        'Use list_systems to know what exists. The kernel will automatically inject any ' +
        'relevant memories from previous runs into your context — read them carefully. ' +
        'Output a short list of what the team has previously flagged as IMPORTANT and what they have flagged as NOISE. ' +
        'This shapes your scan sensitivity.',
      dependsOn: [],
      tools: ['list_systems'],
      tier: 'fast' as const,
      maxTokens: 700,
      critical: true,
      requiresApproval: false,
    },
    {
      id: 'scan',
      name: 'Scan for friction',
      description: 'Wide net across every system for the last 14 days.',
      instruction:
        'Using the sensitivity calibration below:\n\n${stages.recall.output}\n\n' +
        'Call get_activity for the last 14 days across every system. Also call analyse_cross_system ' +
        'to find correlations. Collect every event that could indicate a problem: degrading health, ' +
        'missed deadlines, repeated failures, unusual silence, or contradictory signals across systems. ' +
        'Output a raw unfiltered list — 20+ items is fine. Do not rank yet.',
      dependsOn: ['recall'],
      tools: ['get_activity', 'analyse_cross_system'],
      tier: 'balanced' as const,
      maxTokens: 2000,
      critical: true,
      requiresApproval: false,
    },
    {
      id: 'rank',
      name: 'Algorithmic attention rank',
      description: 'Score each candidate on delta × novelty × recurrence.',
      instruction:
        'You have a raw list of potential problems:\n\n${stages.scan.output}\n\n' +
        'Score each item on THREE dimensions (1–5 each):\n' +
        '  • DELTA: how much has this changed recently? (sudden drops and spikes score high)\n' +
        '  • NOVELTY: is this a new pattern or one we have seen before? (new = higher)\n' +
        '  • RECURRENCE: has this shown up before and been dismissed? (yes = higher, unresolved problems compound)\n\n' +
        'Attention score = DELTA × NOVELTY × RECURRENCE. Output the top 7 items as a ranked list with ' +
        'each item\'s three sub-scores shown inline. Skip anything scoring below 8.',
      dependsOn: ['scan'],
      tools: [],
      tier: 'deep' as const,
      maxTokens: 1500,
      critical: true,
      requiresApproval: false,
    },
    {
      id: 'radar',
      name: 'Write the radar',
      description: 'Human-facing problem radar with recommended actions.',
      instruction:
        'Ranked problems:\n\n${stages.rank.output}\n\n' +
        'Write the problem radar as a decision document. For each top-5 problem:\n' +
        '  1. What it is (one sentence, plain language)\n' +
        '  2. Why it matters (one sentence, business impact)\n' +
        '  3. Recommended action (one sentence, specific and actionable)\n' +
        '  4. Confidence (Low / Medium / High) — how sure are you this is a real problem\n\n' +
        'End with a single "ASK" line: the one question a human needs to answer to unblock Nova this week.',
      dependsOn: ['rank'],
      tools: [],
      tier: 'deep' as const,
      maxTokens: 1800,
      critical: true,
      requiresApproval: true, // humans confirm/reject before signals fire
    },
    {
      id: 'signal',
      name: 'Fire signals',
      description: 'Create tracked signals for each confirmed problem.',
      instruction:
        'Radar produced:\n\n${stages.radar.output}\n\n' +
        'For each HIGH-confidence item, call create_signal with source="problem-radar", ' +
        'priority="HIGH" or "URGENT" based on impact, and a concise description. ' +
        'This creates the trackable record that humans will react to in the UI.',
      dependsOn: ['radar'],
      tools: ['create_signal'],
      tier: 'fast' as const,
      maxTokens: 700,
      critical: false,
      requiresApproval: false,
    },
    {
      id: 'reinforce',
      name: 'Close the synergy loop',
      description: 'Record this run as a learning signal for next week.',
      instruction:
        'This run produced the following radar:\n\n${stages.radar.output}\n\n' +
        'Call record_memory with kind="pattern" and a precise note on what THIS scan\'s ranking ' +
        'algorithm weighted most heavily. Include the three highest-scoring items and the sensitivity ' +
        'calibration you used from prior runs. Next week\'s problem-radar will read this memory and ' +
        'use it to improve its own judgement — this is the Bayesian reinforcement loop that makes ' +
        'GRID compound into institutional intelligence.',
      dependsOn: ['radar'],
      tools: ['record_memory'],
      tier: 'balanced' as const,
      maxTokens: 600,
      critical: false,
      requiresApproval: false,
    },
  ],
};
