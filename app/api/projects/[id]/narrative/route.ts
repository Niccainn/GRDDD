/**
 * GET /api/projects/[id]/narrative
 *
 * A short Nova-written memo that reads the project's trace and
 * summarizes what happened in plain English. Useful for:
 *   - pasting into a status update
 *   - the end-of-project report
 *   - the "Nova worked on this for you" email
 *
 * Cached 15m in-memory per project; force=1 bypasses the cache.
 */

import { NextRequest } from 'next/server';
import { readProject } from '@/lib/projects/store';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

const TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { at: number; text: string }>();

function fallbackNarrative(project: {
  goal: string;
  plan: { title: string; status: string; tool: string }[];
}): string {
  const done = project.plan.filter(s => s.status === 'done').length;
  const total = project.plan.length;
  const tools = Array.from(new Set(project.plan.map(s => s.tool))).slice(0, 4).join(', ');
  const lastDone = [...project.plan].reverse().find(s => s.status === 'done');
  return [
    `Nova has completed ${done} of ${total} steps on "${project.goal}" across ${tools}.`,
    lastDone ? `The most recent landed step was: ${lastDone.title}.` : `No steps have landed yet.`,
    done < total
      ? `The next move is the step after that — check the run trace for the human-review gate status.`
      : `The project is done. Every artifact is linked in the project page for review.`,
  ].join(' ');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id } = await params;
  const project = await readProject(id, identity.id);
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 });

  const force = req.nextUrl.searchParams.get('force') === '1';
  const cached = cache.get(id);
  if (!force && cached && Date.now() - cached.at < TTL_MS) {
    return Response.json({ text: cached.text, cached: true });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const text = fallbackNarrative(project);
    cache.set(id, { at: Date.now(), text });
    return Response.json({ text, cached: false, source: 'fallback' });
  }

  const systemPrompt = [
    'You are Nova, writing a short status update about a project Nova just ran.',
    'Voice: memo. Short sentences. Concrete nouns. No adverbs like "seamlessly".',
    'Exactly three sentences. No headings, no bullets.',
    '1. What was done so far.',
    '2. Where the project is right now (running, waiting for a human, done).',
    '3. What happens next.',
  ].join('\n');

  const context = [
    `Goal: ${project.goal}`,
    '',
    'Plan:',
    project.plan
      .map(s => `  ${s.id}. [${s.status}] ${s.title} (${s.tool})`)
      .join('\n'),
    '',
    'Recent trace (last 10 lines):',
    project.trace
      .slice(-10)
      .map(t => `  - ${t.source}: ${t.message}`)
      .join('\n'),
  ].join('\n');

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: context }],
      }),
    });
    if (!r.ok) throw new Error(`upstream_${r.status}`);
    const data = await r.json();
    const text: string = Array.isArray(data.content)
      ? data.content.map((c: { text?: string }) => c.text ?? '').join('').trim()
      : '';
    const final = text || fallbackNarrative(project);
    cache.set(id, { at: Date.now(), text: final });
    return Response.json({ text: final, cached: false, source: 'nova' });
  } catch {
    const text = fallbackNarrative(project);
    cache.set(id, { at: Date.now(), text });
    return Response.json({ text, cached: false, source: 'fallback' });
  }
}
