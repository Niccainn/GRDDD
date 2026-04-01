import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import WorkflowDetailClient from '@/components/WorkflowDetailClient';

async function getWorkflow(id: string) {
  return prisma.workflow.findUnique({
    where: { id },
    include: {
      system: { include: { environment: true } },
      environment: true,
      executions: { orderBy: { createdAt: 'desc' }, take: 10 },
      _count: { select: { executions: true } },
    },
  });
}

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workflow = await getWorkflow(id);
  if (!workflow) notFound();

  const stages: string[] = JSON.parse(workflow.stages ?? '[]');
  const executions = workflow.executions.map(e => ({
    id: e.id,
    status: e.status,
    input: e.input,
    output: e.output ?? null,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <WorkflowDetailClient
      workflow={{
        id: workflow.id,
        name: workflow.name,
        description: workflow.description ?? null,
        status: workflow.status,
        stages,
        systemId: workflow.systemId,
        systemName: workflow.system.name,
        environmentName: workflow.environment.name,
        environmentSlug: workflow.system.environment.slug,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
        totalRuns: workflow._count.executions,
      }}
      executions={executions}
    />
  );
}
