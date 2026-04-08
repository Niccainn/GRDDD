import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
/**
 * POST /api/signals/triage
 * Nova reads an unrouted signal and suggests which system + workflow it belongs to.
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

  const { signalId } = await req.json();
  if (!signalId) return Response.json({ error: 'signalId required' }, { status: 400 });

  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
    include: { environment: { include: { systems: { include: { workflows: true } } } } },
  });
  if (!signal) return Response.json({ error: 'Signal not found' }, { status: 404 });

  const systemList = signal.environment.systems.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    workflows: s.workflows.map(w => ({ id: w.id, name: w.name, status: w.status })),
  }));

  const prompt = `You are Nova, an AI operations engine for ${signal.environment.name}.

A new signal has come in:
Title: "${signal.title}"
${signal.body ? `Body: "${signal.body}"` : ''}
Source: ${signal.source}

Available systems:
${JSON.stringify(systemList, null, 2)}

Based on the signal content, decide:
1. Which system should handle this? (provide systemId)
2. Which workflow is most relevant? (provide workflowId, or null)
3. Brief reasoning (1-2 sentences)
4. Confidence 0-1

Respond ONLY with valid JSON: { "systemId": "...", "workflowId": "..." | null, "reasoning": "...", "confidence": 0.0-1.0 }`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const routing = JSON.parse(jsonMatch[0]);

    // Validate systemId exists
    const validSystem = systemList.find(s => s.id === routing.systemId);
    if (!validSystem) routing.systemId = null;

    // Update the signal
    const updated = await prisma.signal.update({
      where: { id: signalId },
      data: {
        systemId: routing.systemId || null,
        workflowId: routing.workflowId || null,
        novaRouting: JSON.stringify(routing),
        novaTriaged: true,
        status: 'TRIAGED',
      },
      include: { system: { select: { id: true, name: true, color: true } } },
    });

    return Response.json({
      routing,
      signal: { id: updated.id, status: updated.status, system: updated.system },
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Triage failed' }, { status: 500 });
  }
}
