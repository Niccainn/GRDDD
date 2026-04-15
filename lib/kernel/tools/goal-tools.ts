/**
 * Kernel tools — Goals
 */

import { prisma } from '../../db';
import { registerTool } from './registry';

registerTool({
  name: 'list_goals',
  description:
    'Read the current goals for this system — OKR-style objectives with status, metric, target, and progress.',
  inputSchema: { type: 'object', properties: {} },
  capabilities: ['read'],
  async handler(_args, ctx) {
    if (!ctx.systemId) {
      return { ok: false, summary: 'No system scope', error: 'systemId required' };
    }
    const goals = await prisma.goal.findMany({
      where: { systemId: ctx.systemId },
      orderBy: { createdAt: 'desc' },
    });
    const data = goals.map((g) => ({
      id: g.id,
      title: g.title,
      metric: g.metric,
      target: g.target,
      current: g.current,
      status: g.status,
      progress: g.progress,
      dueDate: g.dueDate?.toISOString().slice(0, 10) ?? null,
    }));
    return {
      ok: true,
      summary: `${data.length} goal${data.length === 1 ? '' : 's'}`,
      data,
    };
  },
});

registerTool({
  name: 'update_goal',
  description: 'Update the status or current value for a goal in this system.',
  inputSchema: {
    type: 'object',
    properties: {
      goalId: { type: 'string' },
      status: {
        type: 'string',
        enum: ['ON_TRACK', 'AT_RISK', 'BEHIND', 'ACHIEVED', 'CANCELLED'],
      },
      current: { type: 'string' },
      progress: { type: 'number' },
    },
    required: ['goalId'],
  },
  capabilities: ['write'],
  async handler(args) {
    const a = args as {
      goalId: string;
      status?: string;
      current?: string;
      progress?: number;
    };
    const updates: Record<string, unknown> = {};
    if (a.status !== undefined) updates.status = a.status;
    if (a.current !== undefined) updates.current = a.current;
    if (a.progress !== undefined) updates.progress = a.progress;
    const updated = await prisma.goal.update({
      where: { id: a.goalId },
      data: updates,
    });
    return {
      ok: true,
      summary: `Goal "${updated.title}" → ${updated.status}`,
      data: { id: updated.id, status: updated.status, current: updated.current },
    };
  },
});
