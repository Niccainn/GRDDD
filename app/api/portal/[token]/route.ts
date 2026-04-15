/**
 * GET /api/portal/[token] — public portal data endpoint.
 * No authentication required — access is gated by the token.
 */
import { prisma } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const link = await prisma.portalLink.findUnique({
    where: { token },
    include: {
      environment: {
        select: {
          name: true,
          brandName: true,
          brandColor: true,
          brandLogo: true,
          color: true,
        },
      },
    },
  });

  if (!link || !link.isActive) {
    return Response.json({ error: 'Portal link not found or inactive' }, { status: 404 });
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return Response.json({ error: 'Portal link has expired' }, { status: 410 });
  }

  const environmentId = link.environmentId;
  const data: Record<string, unknown> = {
    title: link.customTitle ?? link.environment.brandName ?? link.environment.name,
    brandColor: link.environment.brandColor ?? link.environment.color ?? '#7193ED',
    brandLogo: link.environment.brandLogo ?? null,
  };

  if (link.showSystems) {
    data.systems = await prisma.system.findMany({
      where: { environmentId, deletedAt: null },
      select: { id: true, name: true, description: true, color: true, icon: true, healthScore: true },
      orderBy: { name: 'asc' },
    });
  }

  if (link.showWorkflows) {
    data.workflows = await prisma.workflow.findMany({
      where: { environmentId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        stages: true,
        system: { select: { name: true, color: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  if (link.showGoals) {
    data.goals = await prisma.goal.findMany({
      where: { environmentId },
      select: {
        id: true,
        title: true,
        status: true,
        progress: true,
        target: true,
        current: true,
        dueDate: true,
        system: { select: { name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (link.showExecutions) {
    data.executions = await prisma.execution.findMany({
      where: { system: { environmentId, deletedAt: null } },
      select: {
        id: true,
        status: true,
        input: true,
        createdAt: true,
        completedAt: true,
        workflow: { select: { name: true } },
        system: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  return Response.json(data);
}
