import { prisma } from '@/lib/db';

export async function seedConsequences(environmentId: string, systemId: string) {
  // Fetch existing workflows and goals to use real IDs
  const workflows = await prisma.workflow.findMany({
    where: { environmentId },
    select: { id: true, name: true },
  });
  const goals = await prisma.goal.findMany({
    where: { environmentId },
    select: { id: true, title: true },
  });

  const contentPipeline = workflows.find(w => w.name.includes('Content Pipeline'));
  const clientOnboarding = workflows.find(w => w.name.includes('Client Onboarding'));
  const mauGoal = goals.find(g => g.title.includes('active users'));
  const campaignGoal = goals.find(g => g.title.includes('Q2 campaign'));
  const churnGoal = goals.find(g => g.title.includes('churn'));

  const links: {
    sourceType: string; sourceId: string; sourceLabel: string;
    targetType: string; targetId: string; targetLabel: string;
    relationship: string; impact: string; description: string;
    lagTime: string; confidence: number;
  }[] = [
    {
      sourceType: 'workflow',
      sourceId: contentPipeline?.id ?? 'content-pipeline',
      sourceLabel: 'Content Pipeline completes',
      targetType: 'workflow',
      targetId: 'social-distribution',
      targetLabel: 'Social media distribution',
      relationship: 'triggers',
      impact: 'high',
      description: 'Completed content is automatically queued for social media distribution across all channels.',
      lagTime: 'immediate',
      confidence: 0.95,
    },
    {
      sourceType: 'workflow',
      sourceId: 'social-distribution',
      sourceLabel: 'Social media distribution',
      targetType: 'metric',
      targetId: 'engagement-metrics',
      targetLabel: 'Engagement metrics',
      relationship: 'feeds_into',
      impact: 'medium',
      description: 'Published social content generates engagement data that feeds into analytics dashboards.',
      lagTime: 'hours',
      confidence: 0.85,
    },
    {
      sourceType: 'metric',
      sourceId: 'engagement-metrics',
      sourceLabel: 'Engagement metrics',
      targetType: 'goal',
      targetId: mauGoal?.id ?? 'mau-goal',
      targetLabel: 'Monthly active users target',
      relationship: 'improves',
      impact: 'medium',
      description: 'Higher engagement drives user acquisition and retention, contributing to MAU growth.',
      lagTime: 'days',
      confidence: 0.7,
    },
    {
      sourceType: 'workflow',
      sourceId: clientOnboarding?.id ?? 'client-onboarding',
      sourceLabel: 'Client Onboarding delayed',
      targetType: 'metric',
      targetId: 'revenue-recognition',
      targetLabel: 'Revenue recognition',
      relationship: 'blocks',
      impact: 'critical',
      description: 'Delays in client onboarding directly block revenue recognition timelines.',
      lagTime: 'days',
      confidence: 0.9,
    },
    {
      sourceType: 'metric',
      sourceId: 'revenue-recognition',
      sourceLabel: 'Revenue recognition',
      targetType: 'goal',
      targetId: campaignGoal?.id ?? 'revenue-target',
      targetLabel: 'Q2 revenue target',
      relationship: 'feeds_into',
      impact: 'high',
      description: 'Revenue recognition directly impacts quarterly revenue targets.',
      lagTime: 'weeks',
      confidence: 0.85,
    },
    {
      sourceType: 'goal',
      sourceId: campaignGoal?.id ?? 'revenue-target',
      sourceLabel: 'Revenue target missed',
      targetType: 'metric',
      targetId: 'team-morale',
      targetLabel: 'Team morale',
      relationship: 'degrades',
      impact: 'medium',
      description: 'Consistently missing revenue targets erodes team confidence and morale.',
      lagTime: 'weeks',
      confidence: 0.65,
    },
    {
      sourceType: 'workflow',
      sourceId: contentPipeline?.id ?? 'content-pipeline',
      sourceLabel: 'Blog post published',
      targetType: 'metric',
      targetId: 'seo-ranking',
      targetLabel: 'SEO ranking',
      relationship: 'improves',
      impact: 'medium',
      description: 'Each published blog post contributes to improved search engine rankings over time.',
      lagTime: 'weeks',
      confidence: 0.6,
    },
    {
      sourceType: 'metric',
      sourceId: 'seo-ranking',
      sourceLabel: 'SEO ranking improves',
      targetType: 'metric',
      targetId: 'organic-traffic',
      targetLabel: 'Organic traffic',
      relationship: 'feeds_into',
      impact: 'high',
      description: 'Better SEO rankings drive more organic search traffic to the site.',
      lagTime: 'days',
      confidence: 0.8,
    },
    {
      sourceType: 'metric',
      sourceId: 'organic-traffic',
      sourceLabel: 'Organic traffic increases',
      targetType: 'goal',
      targetId: mauGoal?.id ?? 'mau-goal',
      targetLabel: 'Monthly active users target',
      relationship: 'improves',
      impact: 'high',
      description: 'Organic traffic is a primary driver of new user acquisition.',
      lagTime: 'days',
      confidence: 0.75,
    },
    {
      sourceType: 'system',
      sourceId: systemId,
      sourceLabel: 'System health degrades',
      targetType: 'workflow',
      targetId: contentPipeline?.id ?? 'content-pipeline',
      targetLabel: 'Content Pipeline',
      relationship: 'degrades',
      impact: 'high',
      description: 'Poor system health causes workflow failures and delays across all pipelines.',
      lagTime: 'immediate',
      confidence: 0.85,
    },
    {
      sourceType: 'goal',
      sourceId: churnGoal?.id ?? 'churn-goal',
      sourceLabel: 'Customer churn increases',
      targetType: 'metric',
      targetId: 'revenue-recognition',
      targetLabel: 'Revenue recognition',
      relationship: 'degrades',
      impact: 'critical',
      description: 'Rising churn directly reduces recurring revenue and makes targets harder to hit.',
      lagTime: 'immediate',
      confidence: 0.9,
    },
    {
      sourceType: 'metric',
      sourceId: 'team-morale',
      sourceLabel: 'Team morale drops',
      targetType: 'goal',
      targetId: churnGoal?.id ?? 'churn-goal',
      targetLabel: 'Customer churn rate',
      relationship: 'degrades',
      impact: 'medium',
      description: 'Low team morale leads to reduced quality of customer support, increasing churn risk.',
      lagTime: 'weeks',
      confidence: 0.55,
    },
  ];

  for (const link of links) {
    await prisma.consequenceLink.create({
      data: { ...link, environmentId },
    });
  }
}
