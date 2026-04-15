import { getAuthIdentity } from '@/lib/auth';
import { assertOwnsSignal } from '@/lib/auth/ownership';
import { rateLimitApi } from '@/lib/rate-limit';
/**
 * POST /api/signals/triage
 * Nova reads an unrouted signal and suggests which system + workflow it belongs to.
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAnthropicClientForEnvironment, MissingKeyError } from '@/lib/nova/client-factory';

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { signalId } = await req.json();
  if (!signalId) return Response.json({ error: 'signalId required' }, { status: 400 });

  // Ownership check — ensures the caller owns this signal's environment
  await assertOwnsSignal(signalId, identity.id);

  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
    include: { environment: { include: { systems: { include: { workflows: true } } } } },
  });
  if (!signal) return Response.json({ error: 'Signal not found' }, { status: 404 });

  let resolved;
  try {
    resolved = await getAnthropicClientForEnvironment(signal.environmentId);
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return Response.json({ error: err.message, actionUrl: err.actionUrl }, { status: 402 });
    }
    throw err;
  }
  const anthropic = resolved.client;

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
