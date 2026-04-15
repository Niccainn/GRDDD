import { prisma } from '@/lib/db';

/**
 * Seeds compelling cross-domain insights that showcase GRID's
 * organizational intelligence layer.
 */
export async function seedCrossDomainInsights() {
  const existing = await prisma.crossDomainInsight.count();
  if (existing > 0) return; // Don't double-seed

  const insights = [
    {
      title: 'Marketing campaign launches correlate with 34% spike in support tickets within 48 hours',
      description:
        'Nova analyzed 6 months of campaign launch dates against support ticket volume. Every major campaign launch is followed by a measurable surge in customer inquiries, primarily around new feature confusion and pricing questions. Consider pre-launch FAQ updates and proactive support staffing.',
      category: 'causation',
      severity: 'warning',
      confidence: 0.87,
      sourceDomains: JSON.stringify([{ type: 'environment', name: 'Marketing' }]),
      targetDomains: JSON.stringify([{ type: 'environment', name: 'Operations' }]),
      evidence: JSON.stringify({
        campaigns: 12,
        avgTicketIncrease: '34%',
        peakWindow: '24-48 hours post-launch',
        topCategories: ['Pricing questions', 'Feature confusion', 'Onboarding issues'],
      }),
      dataPoints: 847,
    },
    {
      title: "Revenue target 'Hit $2M ARR' is at risk — Content Engine publishing velocity dropped 40% this month",
      description:
        'Content publishing cadence has historically been a leading indicator for inbound pipeline. With a 40% drop in publishing velocity this month, projected inbound leads will fall below the threshold needed to hit the $2M ARR target by Q3. Recommend reallocating resources to content production immediately.',
      category: 'risk',
      severity: 'critical',
      confidence: 0.92,
      sourceDomains: JSON.stringify([{ type: 'system', name: 'Content Engine' }]),
      targetDomains: JSON.stringify([{ type: 'system', name: 'Revenue Operations' }]),
      evidence: JSON.stringify({
        publishingDropPercent: 40,
        currentARR: '$1.4M',
        targetARR: '$2M',
        projectedShortfall: '$180K',
        monthsRemaining: 4,
      }),
      dataPoints: 1243,
    },
    {
      title: "Client Delivery's fast turnaround (2.1 days avg) could power a case study campaign in Growth",
      description:
        'Client Delivery team is averaging 2.1-day turnaround times, significantly outperforming the 5-day industry benchmark. This operational excellence is an untapped growth lever — a targeted case study campaign showcasing these results could generate high-quality inbound leads.',
      category: 'opportunity',
      severity: 'positive',
      confidence: 0.78,
      sourceDomains: JSON.stringify([{ type: 'environment', name: 'Operations' }]),
      targetDomains: JSON.stringify([{ type: 'environment', name: 'Growth' }]),
      evidence: JSON.stringify({
        avgTurnaround: '2.1 days',
        industryBenchmark: '5 days',
        clientSatisfaction: '94%',
        deliveriesAnalyzed: 156,
      }),
      dataPoints: 523,
    },
    {
      title: 'Product roadmap changes directly impact 3 active marketing campaigns — coordinate release timing',
      description:
        'Three active marketing campaigns reference features currently on the product roadmap. Any changes to release timing or feature scope will require immediate campaign updates to avoid messaging misalignment and customer confusion. A shared release calendar is recommended.',
      category: 'dependency',
      severity: 'warning',
      confidence: 0.95,
      sourceDomains: JSON.stringify([{ type: 'system', name: 'Product Roadmap' }]),
      targetDomains: JSON.stringify([{ type: 'environment', name: 'Growth' }]),
      evidence: JSON.stringify({
        affectedCampaigns: ['Q2 Feature Launch', 'Enterprise Tier Announcement', 'Integration Partner Co-marketing'],
        features: ['Advanced Analytics', 'Team Workspaces', 'API v2'],
        riskIfMisaligned: 'Customer confusion, brand credibility impact',
      }),
      dataPoints: 89,
    },
    {
      title: 'Weeks with >4 blog posts see 2.3x more inbound leads in Revenue Operations',
      description:
        'Strong correlation detected between content volume and lead generation. Weeks where at least 4 blog posts are published consistently generate 2.3x more inbound leads compared to weeks with fewer posts. The effect has a 5-7 day lag. Current average is 2.4 posts per week.',
      category: 'correlation',
      severity: 'info',
      confidence: 0.84,
      sourceDomains: JSON.stringify([{ type: 'system', name: 'Content Engine' }]),
      targetDomains: JSON.stringify([{ type: 'system', name: 'Revenue Operations' }]),
      evidence: JSON.stringify({
        threshold: '4 posts/week',
        leadMultiplier: 2.3,
        currentAvg: '2.4 posts/week',
        lagDays: '5-7',
        weeksAnalyzed: 26,
      }),
      dataPoints: 614,
    },
    {
      title: 'Engineering deploy frequency predicts customer churn reduction within 30 days',
      description:
        'Faster deployment cycles correlate with lower churn. Months with weekly deploys show 18% lower churn than months with bi-weekly deploys, likely because faster bug fixes and feature delivery improve customer satisfaction. Current deploy cadence: every 4.2 days.',
      category: 'correlation',
      severity: 'positive',
      confidence: 0.71,
      sourceDomains: JSON.stringify([{ type: 'environment', name: 'Engineering' }]),
      targetDomains: JSON.stringify([{ type: 'system', name: 'Revenue Operations' }]),
      evidence: JSON.stringify({
        weeklyDeployChurnRate: '2.1%',
        biweeklyDeployChurnRate: '2.5%',
        currentCadence: 'every 4.2 days',
        monthsAnalyzed: 8,
      }),
      dataPoints: 392,
    },
  ];

  for (const insight of insights) {
    await prisma.crossDomainInsight.create({ data: insight });
  }
}
