/**
 * Kernel tools — Activity & Memory
 *
 * These expose Nova's own history + memory surface back to Nova so it
 * can reason about recent runs and record distilled learnings. Note
 * that `record_memory` writes into the KernelMemory table via the
 * kernel memory module, so it benefits from the auto-reinforcement
 * logic in recordMemory().
 */

import { prisma } from '../../db';
import { registerTool } from './registry';
import { recordMemory } from '../memory';

registerTool({
  name: 'get_activity',
  description:
    'Retrieve recent Nova trace history and execution records for this system.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: { type: 'number', description: 'Number of records (default 8)' },
    },
  },
  capabilities: ['read'],
  async handler(args, ctx) {
    const limit = Math.min(50, Number((args as { limit?: number }).limit ?? 8));
    if (!ctx.systemId) {
      return { ok: false, summary: 'No system scope', error: 'systemId required' };
    }
    const [traces, executions] = await Promise.all([
      prisma.kernelTrace.findMany({
        where: { systemId: ctx.systemId, tenantId: ctx.tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          createdAt: true,
          surface: true,
          summary: true,
          costUsd: true,
          durationMs: true,
          status: true,
        },
      }),
      prisma.execution.findMany({
        where: { systemId: ctx.systemId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);
    return {
      ok: true,
      summary: `${traces.length} traces · ${executions.length} executions`,
      data: {
        recentTraces: traces,
        recentExecutions: executions.map((e) => ({
          id: e.id,
          status: e.status,
          input: e.input,
          createdAt: e.createdAt,
        })),
      },
    };
  },
});

registerTool({
  name: 'record_memory',
  description:
    'Save important context, decisions, patterns, or caveats to persistent tenant memory. Nova will recall this across future sessions. Use sparingly for things that should actually transcend a single conversation.',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'Short stable identifier, e.g. "tone_preference" or "q2_budget"',
      },
      value: { type: 'string', description: 'The memory content' },
      kind: {
        type: 'string',
        enum: ['preference', 'pattern', 'outcome', 'caveat'],
      },
    },
    required: ['key', 'value', 'kind'],
  },
  capabilities: ['write'],
  async handler(args, ctx) {
    const a = args as {
      key: string;
      value: string;
      kind: 'preference' | 'pattern' | 'outcome' | 'caveat';
    };
    const id = await recordMemory({
      tenantId: ctx.tenantId,
      environmentId: ctx.environmentId,
      systemId: ctx.systemId,
      kind: a.kind,
      key: a.key,
      value: a.value,
    });
    return {
      ok: true,
      summary: `Memory saved: ${a.key}`,
      data: { id, key: a.key, kind: a.kind },
    };
  },
});
