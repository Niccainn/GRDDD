/**
 * Kernel tools — Workflows
 */

import { prisma } from '../../db';
import { registerTool } from './registry';

registerTool({
  name: 'list_workflows',
  description: 'Get all workflows for the current system with status and stages.',
  inputSchema: { type: 'object', properties: {} },
  capabilities: ['read'],
  async handler(_args, ctx) {
    if (!ctx.systemId) {
      return { ok: false, summary: 'No system scope', error: 'systemId required' };
    }
    const workflows = await prisma.workflow.findMany({
      where: { systemId: ctx.systemId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    const data = workflows.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      status: w.status,
      stages: safeJson(w.stages, []),
    }));
    return { ok: true, summary: `${data.length} workflows`, data };
  },
});

registerTool({
  name: 'create_workflow',
  description: 'Create a new workflow in the current system with ordered stages.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      stages: {
        type: 'array',
        items: { type: 'string' },
        description: 'Ordered stage names, e.g. ["Research","Draft","Review","Publish"]',
      },
      status: { type: 'string', enum: ['DRAFT', 'ACTIVE'] },
    },
    required: ['name', 'stages'],
  },
  capabilities: ['write'],
  async handler(args, ctx) {
    const a = args as {
      name: string;
      description?: string;
      stages: string[];
      status?: string;
    };
    if (!ctx.systemId || !ctx.environmentId) {
      return { ok: false, summary: 'Missing scope', error: 'systemId + environmentId required' };
    }
    const workflow = await prisma.workflow.create({
      data: {
        name: a.name,
        description: a.description ?? null,
        stages: JSON.stringify(a.stages ?? []),
        status: a.status ?? 'DRAFT',
        systemId: ctx.systemId,
        environmentId: ctx.environmentId,
        creatorId: ctx.actorId,
      },
    });
    return {
      ok: true,
      summary: `Created "${workflow.name}"`,
      data: { id: workflow.id, name: workflow.name, status: workflow.status },
    };
  },
});

registerTool({
  name: 'update_workflow',
  description: 'Change the status or description of an existing workflow.',
  inputSchema: {
    type: 'object',
    properties: {
      workflowId: { type: 'string' },
      status: {
        type: 'string',
        enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'],
      },
      description: { type: 'string' },
    },
    required: ['workflowId'],
  },
  capabilities: ['write'],
  async handler(args) {
    const a = args as { workflowId: string; status?: string; description?: string };
    const updated = await prisma.workflow.update({
      where: { id: a.workflowId },
      data: {
        ...(a.status ? { status: a.status } : {}),
        ...(a.description ? { description: a.description } : {}),
      },
    });
    return {
      ok: true,
      summary: `Updated "${updated.name}" → ${updated.status}`,
      data: { id: updated.id, name: updated.name, status: updated.status },
    };
  },
});

function safeJson<T>(input: string | null | undefined, fallback: T): T {
  if (!input) return fallback;
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}
