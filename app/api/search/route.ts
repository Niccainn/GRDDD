import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export type SearchResultItem = {
  id: string;
  title: string;
  type: string;
  subtitle: string | null;
  href: string;
  icon: string;
};

export type SearchResponse = {
  results: Record<string, SearchResultItem[]>;
};

export async function GET(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  if (!q || q.length < 1) return Response.json({ results: {} } satisfies SearchResponse);

  const ownerFilter = { ownerId: identity.id, deletedAt: null };
  const envFilter = { environment: ownerFilter };

  const [environments, systems, workflows, goals, tasks, agents, executions] = await Promise.all([
    prisma.environment.findMany({
      where: {
        ...ownerFilter,
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
        ],
      },
      select: { id: true, name: true, slug: true, color: true },
      take: 5,
    }),

    prisma.system.findMany({
      where: {
        ...envFilter,
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
        ],
      },
      select: {
        id: true, name: true,
        environment: { select: { name: true } },
      },
      take: 5,
    }),

    prisma.workflow.findMany({
      where: {
        ...envFilter,
        deletedAt: null,
        OR: [
          { name: { contains: q } },
        ],
      },
      select: {
        id: true, name: true, status: true,
        system: { select: { name: true } },
      },
      take: 5,
    }),

    prisma.goal.findMany({
      where: {
        environment: ownerFilter,
        OR: [
          { title: { contains: q } },
        ],
      },
      select: {
        id: true, title: true, status: true,
        system: { select: { name: true } },
      },
      take: 5,
    }),

    prisma.task.findMany({
      where: {
        environment: ownerFilter,
        deletedAt: null,
        OR: [
          { title: { contains: q } },
        ],
      },
      select: {
        id: true, title: true, status: true, priority: true,
        environment: { select: { name: true } },
      },
      take: 5,
    }),

    prisma.agent.findMany({
      where: {
        environment: ownerFilter,
        deletedAt: null,
        OR: [
          { name: { contains: q } },
        ],
      },
      select: {
        id: true, name: true, status: true,
        environment: { select: { name: true } },
      },
      take: 5,
    }),

    prisma.execution.findMany({
      where: {
        system: { environment: ownerFilter },
        OR: [
          { input: { contains: q } },
        ],
      },
      select: {
        id: true, input: true, status: true,
        system: { select: { name: true } },
      },
      take: 5,
    }),
  ]);

  const results: Record<string, SearchResultItem[]> = {};

  if (environments.length > 0) {
    results.environments = environments.map(e => ({
      id: e.id,
      title: e.name,
      type: 'environment',
      subtitle: `/${e.slug}`,
      href: `/environments/${e.slug}`,
      icon: 'environment',
    }));
  }

  if (systems.length > 0) {
    results.systems = systems.map(s => ({
      id: s.id,
      title: s.name,
      type: 'system',
      subtitle: s.environment.name,
      href: `/systems/${s.id}`,
      icon: 'system',
    }));
  }

  if (workflows.length > 0) {
    results.workflows = workflows.map(w => ({
      id: w.id,
      title: w.name,
      type: 'workflow',
      subtitle: w.system.name,
      href: `/workflows/${w.id}`,
      icon: 'workflow',
    }));
  }

  if (goals.length > 0) {
    results.goals = goals.map(g => ({
      id: g.id,
      title: g.title,
      type: 'goal',
      subtitle: g.system.name,
      href: `/goals`,
      icon: 'goal',
    }));
  }

  if (tasks.length > 0) {
    results.tasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      type: 'task',
      subtitle: t.environment.name,
      href: `/tasks/${t.id}`,
      icon: 'task',
    }));
  }

  if (agents.length > 0) {
    results.agents = agents.map(a => ({
      id: a.id,
      title: a.name,
      type: 'agent',
      subtitle: a.environment.name,
      href: `/agents/${a.id}`,
      icon: 'agent',
    }));
  }

  if (executions.length > 0) {
    results.executions = executions.map(ex => ({
      id: ex.id,
      title: ex.input.slice(0, 50) + (ex.input.length > 50 ? '...' : ''),
      type: 'execution',
      subtitle: ex.system.name,
      href: `/executions/${ex.id}`,
      icon: 'execution',
    }));
  }

  return Response.json({ results } satisfies SearchResponse);
}
