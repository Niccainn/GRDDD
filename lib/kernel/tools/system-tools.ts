/**
 * Kernel tools — Systems
 *
 * Tools that read or write System state. These used to live inline in
 * lib/nova.ts; they now sit behind the tool registry so every surface
 * (chat, workflow, scheduler, webhook) can invoke them through the
 * same interface.
 */

import { prisma } from '../../db';
import { registerTool } from './registry';

registerTool({
  name: 'list_systems',
  description:
    'List all systems in the current environment with health scores and workflow counts.',
  inputSchema: { type: 'object', properties: {} },
  capabilities: ['read'],
  async handler(_args, ctx) {
    if (!ctx.environmentId) {
      return { ok: false, summary: 'No environment scope', error: 'environmentId required' };
    }
    const systems = await prisma.system.findMany({
      where: { environmentId: ctx.environmentId, deletedAt: null },
      include: { _count: { select: { workflows: true } }, systemState: true },
      orderBy: { updatedAt: 'desc' },
    });
    const data = systems.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      healthScore: s.systemState?.healthScore ?? s.healthScore,
      workflowCount: s._count.workflows,
    }));
    return { ok: true, summary: `${data.length} systems`, data };
  },
});

registerTool({
  name: 'set_health_score',
  description:
    'Update the alignment/health score for the current system (0–100) based on your analysis.',
  inputSchema: {
    type: 'object',
    properties: {
      score: { type: 'number', description: 'Score 0–100' },
      reasoning: { type: 'string', description: 'Brief explanation' },
    },
    required: ['score'],
  },
  capabilities: ['write'],
  async handler(args, ctx) {
    const { score } = args as { score: number; reasoning?: string };
    if (!ctx.systemId) {
      return { ok: false, summary: 'No system scope', error: 'systemId required' };
    }
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return { ok: false, summary: 'Invalid score', error: 'score must be 0–100' };
    }
    await prisma.systemState.upsert({
      where: { systemId: ctx.systemId },
      update: { healthScore: score },
      create: { systemId: ctx.systemId, healthScore: score },
    });
    await prisma.system.update({
      where: { id: ctx.systemId },
      data: { healthScore: score },
    });
    return { ok: true, summary: `Health set to ${score}%`, data: { score } };
  },
});

registerTool({
  name: 'analyse_cross_system',
  description:
    'Analyse patterns, bottlenecks, and opportunities across all systems in the environment. Returns a holistic organizational view.',
  inputSchema: {
    type: 'object',
    properties: {
      focus: {
        type: 'string',
        description: 'What to focus on: "health" | "bottlenecks" | "opportunities" | "alignment"',
      },
    },
  },
  capabilities: ['read', 'cross_env'],
  minTier: 'balanced',
  async handler(_args, ctx) {
    if (!ctx.environmentId) {
      return { ok: false, summary: 'No environment scope', error: 'environmentId required' };
    }
    const systems = await prisma.system.findMany({
      where: { environmentId: ctx.environmentId, deletedAt: null },
      include: {
        systemState: true,
        _count: { select: { workflows: true, executions: true, goals: true } },
        goals: { where: { status: { in: ['BEHIND', 'AT_RISK'] } } },
      },
    });
    const data = {
      systems: systems.map((s) => ({
        id: s.id,
        name: s.name,
        health: s.systemState?.healthScore ?? s.healthScore,
        workflows: s._count.workflows,
        executions: s._count.executions,
        goals: s._count.goals,
        atRiskGoals: s.goals.map((g) => ({ title: g.title, status: g.status })),
        lastActivity: s.systemState?.lastActivity,
      })),
      environmentHealth:
        systems.length > 0
          ? systems.reduce(
              (sum, s) => sum + (s.systemState?.healthScore ?? s.healthScore ?? 0),
              0
            ) / systems.length
          : null,
    };
    return { ok: true, summary: `Analysed ${systems.length} systems`, data };
  },
});
