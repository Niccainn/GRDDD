import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
/**
 * POST /api/reports
 * Nova generates a structured org-level health and status report.
 * Returns a streaming SSE response.
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { type = 'weekly', environmentId } = await req.json().catch(() => ({}));

  // Gather all org data
  const [systems, executions, goals, workflows, signals] = await Promise.all([
    prisma.system.findMany({
      where: environmentId ? { environmentId } : {},
      include: {
        environment: true,
        workflows: { orderBy: { updatedAt: 'desc' } },
        systemState: true,
        goals: true,
        _count: { select: { executions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.execution.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        ...(environmentId ? { system: { environmentId } } : {}),
      },
      include: { system: { select: { name: true } }, validationResult: { select: { score: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.goal.findMany({
      where: environmentId ? { environmentId } : {},
      include: { system: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.workflow.findMany({
      where: environmentId ? { environmentId } : {},
      include: { system: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.signal.findMany({
      where: {
        status: { in: ['UNREAD', 'TRIAGED'] },
        ...(environmentId ? { environmentId } : {}),
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const completed = executions.filter(e => e.status === 'COMPLETED').length;
  const failed = executions.filter(e => e.status === 'FAILED').length;
  const avgScore = (() => {
    const scores = executions.filter(e => e.validationResult?.score != null).map(e => e.validationResult!.score!);
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) : null;
  })();

  const systemSummaries = systems.map(s => {
    const health = s.systemState?.healthScore ?? s.healthScore ?? null;
    const activeGoals = s.goals.filter(g => !['ACHIEVED', 'CANCELLED'].includes(g.status));
    const atRisk = s.goals.filter(g => ['AT_RISK', 'BEHIND'].includes(g.status));
    return `**${s.name}** (${s.environment.name})
- Health: ${health !== null ? `${Math.round(health)}%` : 'unknown'}
- Workflows: ${s.workflows.length} total, ${s.workflows.filter(w => w.status === 'ACTIVE').length} active
- Goals: ${activeGoals.length} active${atRisk.length ? `, ${atRisk.length} at risk/behind` : ''}
- Executions (all time): ${s._count.executions}`;
  }).join('\n\n');

  const goalsSummary = goals.length
    ? goals.slice(0, 15).map(g => `- [${g.system.name}] ${g.title}: ${g.status}${g.current ? ` (${g.current})` : ''}`).join('\n')
    : 'No goals configured';

  const pendingSignals = signals.length ? signals.map(s => `- [${s.priority}] ${s.title}`).join('\n') : 'None';

  const reportType = type === 'weekly' ? 'Weekly Operations Report' : type === 'health' ? 'System Health Review' : 'Status Report';

  const prompt = `You are Nova, the intelligence engine for GRID. Generate a comprehensive ${reportType}.

## Organisation Data

### Systems (${systems.length} total)
${systemSummaries || 'No systems yet'}

### Executions (last 7 days)
- Total: ${executions.length}
- Completed: ${completed}
- Failed: ${failed}
- Avg quality score: ${avgScore !== null ? `${avgScore}%` : 'no data'}

### Goals (${goals.length} total)
${goalsSummary}

### Pending Signals
${pendingSignals}

### Workflows
- Total: ${workflows.length}
- Active: ${workflows.filter(w => w.status === 'ACTIVE').length}
- Paused: ${workflows.filter(w => w.status === 'PAUSED').length}

---

Write a ${reportType}. Structure it with these sections:
1. **Executive Summary** — 2-3 sentence overview of org health
2. **System Status** — per-system health, what's working, what needs attention
3. **Goal Progress** — how goals are tracking, any at risk
4. **Operations** — execution volume, quality, notable patterns
5. **Recommendations** — 3-5 specific, actionable things to do this week
6. **Signals & Attention** — pending items that need a human decision

Be direct, factual, and specific. Reference actual names and numbers from the data. Use markdown formatting.`;

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const stream = anthropic.messages.stream({
          model: 'claude-haiku-4-5',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            send({ type: 'text', text: chunk.delta.text });
          }
        }

        const final = await stream.finalMessage();
        send({ type: 'done', tokens: final.usage.input_tokens + final.usage.output_tokens });
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Report generation failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
