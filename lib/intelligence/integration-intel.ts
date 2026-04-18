/**
 * Integration Intelligence — learns the operational role of each
 * connected integration from signal flow patterns.
 *
 * After an integration is connected, this module analyzes signal
 * patterns to determine: how many signals it generates, where they
 * route, how critical it is to business operations, and what happens
 * when it goes quiet.
 */

import { prisma } from '@/lib/db';

/**
 * Update intelligence for all active integrations in an environment.
 * Call periodically (e.g., daily) or after signal processing.
 */
export async function updateIntegrationIntelligence(environmentId: string) {
  const integrations = await prisma.integration.findMany({
    where: { environmentId, status: 'ACTIVE' },
    select: { id: true, provider: true, displayName: true },
  });

  let updated = 0;

  for (const integration of integrations) {
    // Count signals from this integration
    const signalSource = `integration:${integration.provider}`;
    const [totalSignals, weekSignals, priorityGroups] = await Promise.all([
      prisma.signal.count({
        where: { environmentId, source: signalSource },
      }),
      prisma.signal.count({
        where: {
          environmentId,
          source: signalSource,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.signal.groupBy({
        by: ['priority'],
        where: { environmentId, source: signalSource },
        _count: { id: true },
      }),
    ]);

    // Find primary system (most signals routed to)
    const routedSignals = await prisma.signal.groupBy({
      by: ['systemId'],
      where: {
        environmentId,
        source: signalSource,
        systemId: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    });

    let primarySystemId: string | null = null;
    let primarySystemName: string | null = null;
    if (routedSignals.length > 0 && routedSignals[0].systemId) {
      primarySystemId = routedSignals[0].systemId;
      const sys = await prisma.system.findUnique({
        where: { id: primarySystemId },
        select: { name: true },
      });
      primarySystemName = sys?.name || null;
    }

    // Routing accuracy: signals triaged correctly by Nova
    const triagedCount = await prisma.signal.count({
      where: { environmentId, source: signalSource, novaTriaged: true },
    });
    const routingAccuracy = totalSignals > 0 ? triagedCount / totalSignals : null;

    // Determine operational role
    let operationalRole = 'signal_source';
    if (totalSignals === 0) operationalRole = 'data_sync';
    if (weekSignals > totalSignals * 0.5 && totalSignals > 10) operationalRole = 'primary_signal_source';

    // Dependency score: how critical is this integration?
    const dependencyScore = Math.min(1, (totalSignals / 100) * 0.5 + (weekSignals / 20) * 0.5);

    // Priority breakdown
    const priorityBreakdown: Record<string, number> = {};
    for (const g of priorityGroups) {
      priorityBreakdown[g.priority] = g._count.id;
    }

    // Upsert intelligence record
    await prisma.integrationIntelligence.upsert({
      where: { integrationId: integration.id },
      create: {
        integrationId: integration.id,
        provider: integration.provider,
        signalVolume: totalSignals,
        signalVolumeWeek: weekSignals,
        avgSignalsPerDay: Math.round((weekSignals / 7) * 10) / 10,
        priorityBreakdown: JSON.stringify(priorityBreakdown),
        routingAccuracy,
        primarySystemId,
        primarySystemName,
        operationalRole,
        dependencyScore: Math.round(dependencyScore * 100) / 100,
        lastActiveAt: new Date(),
        environmentId,
      },
      update: {
        signalVolume: totalSignals,
        signalVolumeWeek: weekSignals,
        avgSignalsPerDay: Math.round((weekSignals / 7) * 10) / 10,
        priorityBreakdown: JSON.stringify(priorityBreakdown),
        routingAccuracy,
        primarySystemId,
        primarySystemName,
        operationalRole,
        dependencyScore: Math.round(dependencyScore * 100) / 100,
        lastActiveAt: new Date(),
      },
    });

    updated++;
  }

  return { updated };
}
