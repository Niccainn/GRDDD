import { prisma } from '@/lib/db';

/**
 * Seeds sample Nova reflections for an environment.
 * Called during onboarding to populate the Reflective Insights widget.
 */
export async function seedReflections(environmentId: string, systemId: string) {
  const reflections = [
    {
      insight: 'Content Pipeline velocity increased 23% this week — the new review stage is working.',
      category: 'performance',
      severity: 'positive',
      metric: 'Pipeline Velocity',
      metricValue: 23.0,
      metricDelta: 23.0,
      confidence: 0.91,
      suggestion: 'Consider applying the same review pattern to Client Onboarding to see similar gains.',
    },
    {
      insight: 'Tuesday blog posts get 2.1x more engagement than other days. Consider shifting publishing schedule.',
      category: 'opportunity',
      severity: 'info',
      metric: 'Engagement Multiplier',
      metricValue: 2.1,
      metricDelta: 0.8,
      confidence: 0.84,
      suggestion: 'Move your top-priority content to Tuesday mornings. Data shows 9-11 AM is the peak window.',
    },
    {
      insight: 'Client onboarding bottleneck at Training stage — averaging 4.2 days vs 2-day target.',
      category: 'risk',
      severity: 'warning',
      metric: 'Stage Duration (days)',
      metricValue: 4.2,
      metricDelta: 2.2,
      confidence: 0.88,
      suggestion: 'Split Training into async self-serve modules and a live Q&A session to reduce wait time.',
    },
    {
      insight: 'You override Nova\'s priority suggestions on client tasks 73% of the time. Should client work be weighted higher?',
      category: 'pattern',
      severity: 'info',
      metric: 'Override Rate',
      metricValue: 73.0,
      metricDelta: 12.0,
      confidence: 0.79,
      suggestion: 'Increase client task base priority by 1.5x so Nova\'s suggestions align with your behavior.',
    },
    {
      insight: '3 of 5 workflow stages have <10 min processing time. Consider merging Research and Draft stages.',
      category: 'efficiency',
      severity: 'info',
      metric: 'Avg Stage Time (min)',
      metricValue: 8.3,
      metricDelta: -3.1,
      confidence: 0.82,
      suggestion: 'Merge Research and Draft into a single "Research & Draft" stage to reduce handoff overhead.',
    },
    {
      insight: 'Engagement dropped 31% despite consistent publishing. External factor suspected.',
      category: 'anomaly',
      severity: 'warning',
      metric: 'Engagement Rate',
      metricValue: -31.0,
      metricDelta: -31.0,
      confidence: 0.65,
      suggestion: 'Check for algorithm changes or seasonal trends. Consider A/B testing new content formats.',
    },
    {
      insight: 'Goal completion rate up 18% since implementing weekly reviews. Momentum is building.',
      category: 'performance',
      severity: 'positive',
      metric: 'Goal Completion Rate',
      metricValue: 78.0,
      metricDelta: 18.0,
      confidence: 0.93,
      suggestion: null,
    },
    {
      insight: 'System health consistently above 80% for 14 consecutive days — longest streak recorded.',
      category: 'pattern',
      severity: 'positive',
      metric: 'Health Streak (days)',
      metricValue: 14.0,
      metricDelta: 6.0,
      confidence: 0.95,
      suggestion: 'Document your current process as a template — this stability is worth replicating.',
    },
  ];

  for (const r of reflections) {
    await prisma.novaReflection.create({
      data: {
        ...r,
        environmentId,
        systemId,
      },
    });
  }
}
