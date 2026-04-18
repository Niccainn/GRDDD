/**
 * Operational Playbook Generator
 *
 * Synthesizes MasteryInsights, KernelMemory, AutonomyPeriods, and
 * ConsequenceLinks into a structured operational playbook — a living
 * document that describes exactly how this user's business works.
 *
 * The playbook is auto-generated and auto-updated as new data comes in.
 */

import { prisma } from '@/lib/db';

type PlaybookSection = {
  systemName: string;
  systemId: string;
  bestInput: string | null;
  criticalStage: string | null;
  timing: string | null;
  integrationDependency: string | null;
  autonomyLevel: number | null;
  autonomyTrajectory: string | null;
  topPatterns: string[];
};

type PlaybookContent = {
  generatedAt: string;
  environmentName: string;
  sections: PlaybookSection[];
  crossSystem: string[];
  trajectory: {
    firstPeriodAvg: number | null;
    lastPeriodAvg: number | null;
    improvementRate: number | null;
    totalRuns: number;
    totalReviews: number;
  };
};

export async function generatePlaybook(environmentId: string): Promise<{
  content: PlaybookContent;
  runsAnalyzed: number;
  insightsUsed: number;
}> {
  // Fetch all data sources
  const [environment, systems, insights, memories, autonomyConfigs, consequences, reviews] = await Promise.all([
    prisma.environment.findUnique({ where: { id: environmentId }, select: { name: true } }),
    prisma.system.findMany({
      where: { environmentId },
      select: { id: true, name: true, healthScore: true },
    }),
    prisma.masteryInsight.findMany({
      where: { environmentId },
      orderBy: { strength: 'desc' },
    }),
    prisma.kernelMemory.findMany({
      where: { environmentId, confidence: { gte: 0.6 } },
      orderBy: { reinforcements: 'desc' },
      take: 50,
    }),
    prisma.autonomyConfig.findMany({
      where: { environmentId },
    }),
    prisma.consequenceLink.findMany({
      where: { environmentId, coefficient: { not: null } },
    }),
    prisma.executionReview.findMany({
      where: { environmentId },
      orderBy: { createdAt: 'asc' },
      select: { overallScore: true, createdAt: true },
    }),
  ]);

  // Build per-system sections
  const sections: PlaybookSection[] = systems.map(sys => {
    const sysInsights = insights.filter(i => i.workflowId === null || i.workflowId === sys.id);
    const sysMemories = memories.filter(m => m.systemId === sys.id);
    const sysAutonomy = autonomyConfigs.find(a => a.scopeType === 'system' && a.scopeId === sys.id);
    const sysConsequences = consequences.filter(c => c.sourceId === sys.id);

    // Extract best input pattern
    const inputInsight = sysInsights.find(i => i.category === 'input_pattern');
    // Extract critical stage
    const stageInsight = sysInsights.find(i => i.category === 'stage_pattern');
    // Extract timing pattern
    const timingInsight = sysInsights.find(i => i.category === 'timing_pattern');

    // Integration dependency from consequences
    const integrationDep = sysConsequences.find(c =>
      c.relationship === 'requires' || c.relationship === 'feeds_into'
    );

    // Top patterns from memory
    const topPatterns = sysMemories
      .filter(m => m.kind === 'pattern' || m.kind === 'outcome')
      .slice(0, 3)
      .map(m => `${m.key}: ${m.value}`);

    return {
      systemName: sys.name,
      systemId: sys.id,
      bestInput: inputInsight?.principle || null,
      criticalStage: stageInsight?.principle || null,
      timing: timingInsight?.principle || null,
      integrationDependency: integrationDep
        ? `${integrationDep.targetLabel} (${integrationDep.relationship}, coefficient: ${integrationDep.coefficient})`
        : null,
      autonomyLevel: sysAutonomy?.level ?? null,
      autonomyTrajectory: sysAutonomy
        ? sysAutonomy.approvalRate >= 0.9 ? 'Ready for upgrade'
          : sysAutonomy.approvalRate >= 0.7 ? 'Building trust'
          : 'Needs calibration'
        : null,
      topPatterns,
    };
  });

  // Cross-system insights from consequence links
  const crossSystem = consequences
    .filter(c => c.coefficient !== null && c.dataPoints >= 3)
    .map(c =>
      `When ${c.sourceLabel} health changes, ${c.targetLabel} is affected by ~${Math.round((c.coefficient ?? 0) * 100)}% within ${c.lagDays ? `${c.lagDays} days` : c.lagTime || 'unknown timeframe'} (${c.dataPoints} observations, ${Math.round(c.confidence * 100)}% confidence)`
    );

  // Improvement trajectory
  const totalReviews = reviews.length;
  const quarter = Math.max(1, Math.floor(totalReviews / 4));
  const firstPeriod = reviews.slice(0, quarter);
  const lastPeriod = reviews.slice(-quarter);

  const firstPeriodAvg = firstPeriod.length > 0
    ? Math.round((firstPeriod.reduce((s, r) => s + r.overallScore, 0) / firstPeriod.length) * 10) / 10
    : null;
  const lastPeriodAvg = lastPeriod.length > 0
    ? Math.round((lastPeriod.reduce((s, r) => s + r.overallScore, 0) / lastPeriod.length) * 10) / 10
    : null;
  const improvementRate = firstPeriodAvg && lastPeriodAvg
    ? Math.round(((lastPeriodAvg - firstPeriodAvg) / firstPeriodAvg) * 100)
    : null;

  const content: PlaybookContent = {
    generatedAt: new Date().toISOString(),
    environmentName: environment?.name || 'Unknown',
    sections,
    crossSystem,
    trajectory: {
      firstPeriodAvg,
      lastPeriodAvg,
      improvementRate,
      totalRuns: totalReviews, // approximation
      totalReviews,
    },
  };

  // Persist the playbook
  await prisma.operationalPlaybook.upsert({
    where: { environmentId },
    create: {
      content: JSON.stringify(content),
      runsAnalyzed: totalReviews,
      insightsUsed: insights.length,
      firstPeriodAvg,
      lastPeriodAvg,
      improvementRate,
      lastGeneratedAt: new Date(),
      environmentId,
    },
    update: {
      content: JSON.stringify(content),
      version: { increment: 1 },
      runsAnalyzed: totalReviews,
      insightsUsed: insights.length,
      firstPeriodAvg,
      lastPeriodAvg,
      improvementRate,
      lastGeneratedAt: new Date(),
      stale: false,
    },
  });

  return {
    content,
    runsAnalyzed: totalReviews,
    insightsUsed: insights.length,
  };
}
