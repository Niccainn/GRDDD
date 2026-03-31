import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const [systems, rawLogs, workflows] = await Promise.all([
    prisma.system.findMany({
      include: { environment: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.intelligenceLog.findMany({
      where: { action: 'nova_query' },
      include: { intelligence: { include: { system: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.workflow.findMany({
      include: { system: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
  ]);

  const logs = rawLogs.map(log => ({
    id: log.id,
    input: log.input ? JSON.parse(log.input).query ?? '' : '',
    output: log.output ? JSON.parse(log.output).response ?? '' : '',
    systemName: log.intelligence?.system?.name ?? '',
    createdAt: log.createdAt.toISOString(),
  }));

  return NextResponse.json({ systems, logs, workflows });
}
