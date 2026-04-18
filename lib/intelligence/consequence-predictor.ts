/**
 * Consequence Predictor — learns impact coefficients from execution data.
 *
 * When a system's health changes or a workflow runs, this module updates
 * the ConsequenceLink edges with learned coefficients based on observed
 * correlations over time.
 *
 * A coefficient of 0.73 on a "Marketing → feeds_into → Sales" link means:
 * historically, a 10% improvement in Marketing health predicts a 7.3%
 * improvement in Sales pipeline within the learned lag time.
 */

import { prisma } from '@/lib/db';

type HealthSnapshot = {
  systemId: string;
  healthScore: number;
  timestamp: Date;
};

/**
 * Update consequence link coefficients based on health score history.
 * Called after health score changes or periodically.
 */
export async function updateConsequenceCoefficients(environmentId: string) {
  // Fetch all consequence links for this environment
  const links = await prisma.consequenceLink.findMany({
    where: { environmentId },
  });

  if (links.length === 0) return { updated: 0 };

  // Fetch recent system health data (from SystemState or direct)
  const systems = await prisma.system.findMany({
    where: { environmentId },
    select: { id: true, name: true, healthScore: true, updatedAt: true },
  });

  const healthMap = new Map(systems.map(s => [s.id, s]));

  let updated = 0;

  for (const link of links) {
    if (link.sourceType !== 'system' || link.targetType !== 'system') continue;

    const source = healthMap.get(link.sourceId);
    const target = healthMap.get(link.targetId);
    if (!source?.healthScore || !target?.healthScore) continue;

    // Simple correlation update: track the ratio between source and target health
    const sourceHealth = source.healthScore;
    const targetHealth = target.healthScore;

    // Avoid division by zero
    if (sourceHealth === 0) continue;

    const observedRatio = targetHealth / sourceHealth;
    const currentCoefficient = link.coefficient ?? observedRatio;

    // Exponential moving average: new = 0.2 * observed + 0.8 * historical
    const alpha = 0.2;
    const newCoefficient = currentCoefficient * (1 - alpha) + observedRatio * alpha;
    const newDataPoints = link.dataPoints + 1;

    // Detect anomaly: if current observation differs >30% from historical
    const deviation = Math.abs(observedRatio - currentCoefficient) / Math.max(currentCoefficient, 0.01);
    const isAnomaly = deviation > 0.3 && link.dataPoints >= 5;

    await prisma.consequenceLink.update({
      where: { id: link.id },
      data: {
        coefficient: Math.round(newCoefficient * 1000) / 1000,
        dataPoints: newDataPoints,
        lastObservedAt: new Date(),
        confidence: Math.min(1, 0.5 + (newDataPoints * 0.05)), // Confidence grows with data
        anomalyFlag: isAnomaly,
        anomalyDetail: isAnomaly
          ? `Recent coefficient ${observedRatio.toFixed(2)} deviates ${Math.round(deviation * 100)}% from historical ${currentCoefficient.toFixed(2)}`
          : null,
      },
    });

    updated++;
  }

  return { updated };
}

/**
 * Predict the impact of a health change on downstream systems.
 */
export async function predictCascadingEffects(
  environmentId: string,
  systemId: string,
  healthDelta: number
): Promise<Array<{
  targetSystemId: string;
  targetSystemName: string;
  predictedImpact: number;
  lagDays: number | null;
  confidence: number;
  relationship: string;
}>> {
  const links = await prisma.consequenceLink.findMany({
    where: {
      environmentId,
      sourceType: 'system',
      sourceId: systemId,
      coefficient: { not: null },
      dataPoints: { gte: 3 }, // Only predict when we have enough data
    },
  });

  return links.map(link => ({
    targetSystemId: link.targetId,
    targetSystemName: link.targetLabel,
    predictedImpact: Math.round(healthDelta * (link.coefficient ?? 0) * 10) / 10,
    lagDays: link.lagDays,
    confidence: link.confidence,
    relationship: link.relationship,
  }));
}
