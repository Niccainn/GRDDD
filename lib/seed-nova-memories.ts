import { prisma } from '@/lib/db';

/**
 * Seeds sample NovaMemory records to demonstrate the Continuity surface.
 */
export async function seedNovaMemories(environmentId: string) {
  const memories = [
    {
      type: 'brand_context',
      category: 'tone',
      title: 'Brand voice: confident but approachable',
      content:
        'Our brand voice is confident, clear, and approachable. We avoid jargon and corporate speak. Use active voice and short sentences. Address the reader directly with "you" rather than "users" or "customers".',
      source: 'user_input',
      confidence: 0.95,
    },
    {
      type: 'brand_context',
      category: 'audience',
      title: 'Primary audience: growth-stage founders',
      content:
        'Our core audience is founders and operators at growth-stage startups (Series A-C, 20-200 employees). They value speed, clarity, and ROI. They are time-poor and skeptical of enterprise fluff.',
      source: 'user_input',
      confidence: 0.92,
    },
    {
      type: 'brand_context',
      category: 'values',
      title: 'Core brand values',
      content:
        'Three pillars: Radical transparency (share the real numbers), Builder-first (tools should feel invisible), Compounding momentum (small wins daily beat quarterly pivots).',
      source: 'user_input',
      confidence: 0.9,
    },
    {
      type: 'market_insight',
      category: 'competitor',
      title: 'Competitor gap: no one owns ops intelligence',
      content:
        'Competitors focus on task management or analytics separately. None combine real-time operational awareness with AI-driven recommendations. This is our wedge: the ops intelligence layer.',
      source: 'nova_observation',
      confidence: 0.78,
    },
    {
      type: 'market_insight',
      category: 'trend',
      title: 'Industry shift toward agentic workflows',
      content:
        'The market is moving from "AI as copilot" to "AI as autonomous operator." Companies that let AI take action (not just suggest) will capture the next wave. Our automations and Nova execution model are positioned for this.',
      source: 'nova_observation',
      confidence: 0.82,
    },
    {
      type: 'learned_preference',
      category: 'workflow',
      title: 'Preferred task priority: impact over urgency',
      content:
        'When prioritising tasks, this user consistently ranks by expected impact rather than deadline proximity. High-impact items get surfaced first even if their due date is further out.',
      source: 'nova_observation',
      confidence: 0.85,
    },
    {
      type: 'learned_preference',
      category: 'communication',
      title: 'Communication style: bullet points over paragraphs',
      content:
        'User prefers concise bullet-point summaries over long narrative paragraphs. Responses should lead with the key takeaway, then supporting points. Maximum 5 bullets per section.',
      source: 'nova_observation',
      confidence: 0.88,
    },
    {
      type: 'pattern',
      category: 'workflow_pattern',
      title: 'Client onboarding averages 4.2 days',
      content:
        'Based on 23 completed onboarding workflows, the average time from intake to kickoff is 4.2 business days. The "Discovery" stage is the bottleneck at 1.8 days average.',
      source: 'execution_analysis',
      confidence: 0.91,
    },
    {
      type: 'pattern',
      category: 'content_pattern',
      title: 'Tuesday blog posts get 2x engagement',
      content:
        'Content published on Tuesdays between 9-11am receives 2.1x more engagement than other days. Wednesday is second best. Avoid Friday publishing — engagement drops 60%.',
      source: 'execution_analysis',
      confidence: 0.87,
    },
    {
      type: 'strategic_context',
      category: 'planning',
      title: 'Q2 focus: activate self-serve motion',
      content:
        'The strategic priority for Q2 is launching the self-serve signup and onboarding flow. All systems should support this: content pipeline feeds SEO, automations handle trial nurture, dashboards track activation metrics.',
      source: 'user_input',
      confidence: 0.93,
    },
  ];

  for (const mem of memories) {
    await prisma.novaMemory.create({
      data: {
        ...mem,
        environmentId,
      },
    });
  }
}
