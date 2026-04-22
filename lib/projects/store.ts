/**
 * Project persistence. Zero-migration: projects are stored as
 * Execution rows whose `output` column is a JSON blob matching the
 * Project type. A disposable Workflow row is created per project
 * so the FK relationships stay clean.
 *
 * We use Execution because it already has systemId, createdAt,
 * status, and relations to ExecutionReview / DecisionPoint — so
 * features like "review this run" carry over automatically.
 */

import { prisma } from '@/lib/db';
import type { Project, Step } from './types';

export async function createProject(args: {
  environmentId: string;
  systemId?: string | null;
  goal: string;
  plan: Step[];
  creatorId: string;
  openingMessage: string;
}): Promise<Project> {
  // Create (or pick) a throwaway Workflow row to satisfy FKs. Naming
  // it after the goal makes the underlying Execution discoverable
  // from the workflow list too.
  const targetSystemId = args.systemId ?? await resolveDefaultSystem(args.environmentId);
  if (!targetSystemId) {
    throw new Error('No System available in this Environment to host the project.');
  }

  const workflow = await prisma.workflow.create({
    data: {
      name: args.goal.slice(0, 80),
      description: 'Auto-generated for Nova project run.',
      status: 'ACTIVE',
      stages: JSON.stringify(args.plan.map(s => ({ id: s.id, title: s.title, tool: s.tool }))),
      systemId: targetSystemId,
      environmentId: args.environmentId,
      creatorId: args.creatorId,
    },
    select: { id: true },
  });

  const project: Project = {
    kind: 'project',
    version: 1,
    id: '',
    goal: args.goal,
    status: 'running',
    environmentId: args.environmentId,
    systemId: targetSystemId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plan: args.plan,
    artifacts: [],
    trace: [
      {
        at: new Date().toISOString(),
        stepId: null,
        source: 'nova',
        message: args.openingMessage,
      },
    ],
    cursor: 0,
  };

  const execution = await prisma.execution.create({
    data: {
      status: 'RUNNING',
      input: args.goal,
      output: JSON.stringify(project),
      systemId: targetSystemId,
      workflowId: workflow.id,
    },
    select: { id: true },
  });

  project.id = execution.id;
  // Write back the final id so clients holding the object are
  // consistent with the persisted row.
  await prisma.execution.update({
    where: { id: execution.id },
    data: { output: JSON.stringify(project) },
  });

  return project;
}

export async function readProject(id: string, identityId: string): Promise<Project | null> {
  const execution = await prisma.execution.findFirst({
    where: {
      id,
      system: {
        environment: {
          deletedAt: null,
          OR: [
            { ownerId: identityId },
            { memberships: { some: { identityId } } },
          ],
        },
      },
    },
    select: { id: true, output: true },
  });
  if (!execution?.output) return null;
  try {
    const parsed = JSON.parse(execution.output) as Project;
    if (parsed.kind !== 'project') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeProject(id: string, project: Project): Promise<void> {
  const next = {
    ...project,
    updatedAt: new Date().toISOString(),
  };
  await prisma.execution.update({
    where: { id },
    data: {
      output: JSON.stringify(next),
      status:
        project.status === 'done'
          ? 'COMPLETED'
          : project.status === 'failed'
          ? 'FAILED'
          : 'RUNNING',
      ...(project.status === 'done' ? { completedAt: new Date() } : {}),
    },
  });
}

export async function listProjects(
  environmentId: string,
  identityId: string,
  limit = 12,
): Promise<Project[]> {
  const rows = await prisma.execution.findMany({
    where: {
      system: {
        environmentId,
        environment: {
          deletedAt: null,
          OR: [
            { ownerId: identityId },
            { memberships: { some: { identityId } } },
          ],
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 80,
    select: { output: true, createdAt: true, status: true },
  });
  const out: Project[] = [];
  for (const r of rows) {
    if (!r.output) continue;
    try {
      const p = JSON.parse(r.output) as Project;
      if (p.kind === 'project') out.push(p);
    } catch {
      /* not a project */
    }
    if (out.length >= limit) break;
  }
  return out;
}

async function resolveDefaultSystem(environmentId: string): Promise<string | null> {
  const s = await prisma.system.findFirst({
    where: { environmentId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return s?.id ?? null;
}
