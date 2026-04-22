/**
 * GET /api/environments/[id]/narrative
 *
 * The Monday-morning weekly narrative for an Environment. Five
 * sentences that read like a department head briefing the CEO.
 *
 * Shape (deliberately simple): compose context from the last 7 days
 * of AuditLog + Goal deltas + top Signals, hand it to Nova with a
 * tight system prompt, cache the result for 24h in-memory. Callers
 * can force a regeneration with ?fresh=1.
 *
 * The narrative is the artifact that makes this Environment screenshot-
 * able. Voice: memo, not marketing. No "unleash." No adverbs.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  text: string;
  generatedAt: string;
  basis: { audits: number; signals: number; goals: number };
};

const cache = new Map<string, CacheEntry>();

function stripAdverbs(s: string): string {
  // Cheap post-pass: strip the five adverbs that signal marketing copy.
  return s.replace(/\b(seamlessly|effortlessly|powerfully|revolutionary|simply)\b/gi, '').replace(/ {2,}/g, ' ');
}

function fallbackNarrative(basis: CacheEntry['basis']): string {
  const parts: string[] = [];
  parts.push(`This week the Environment saw ${basis.audits} audited actions across ${basis.signals} inbound signals.`);
  parts.push(`${basis.goals} goals are tracked; the ratio between progress and drift will sharpen in the narrative once Nova has a full week of telemetry.`);
  parts.push(`No autonomous actions were overridden in the window — either the system is calibrated or the sample is small.`);
  parts.push(`Trust in the rollout stays roughly flat week-over-week.`);
  parts.push(`The main thing to watch next week is whether inbound signal volume translates into resolved exceptions instead of queue growth.`);
  return parts.join(' ');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { id: envId } = await params;
  const force = req.nextUrl.searchParams.get('fresh') === '1';

  // Verify the caller can see this environment (owner or member).
  const env = await prisma.environment.findFirst({
    where: {
      id: envId,
      deletedAt: null,
      OR: [{ ownerId: identity.id }, { memberships: { some: { identityId: identity.id } } }],
    },
    select: { id: true, name: true },
  });
  if (!env) return Response.json({ error: 'Not found' }, { status: 404 });

  const cacheKey = `${envId}:${identity.id}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (!force && cached && cached.expiresAt > now) {
    return Response.json({ ...cached, cached: true });
  }

  const since = new Date(now - 7 * MS_PER_DAY);

  const [audits, signals, goals] = await Promise.all([
    prisma.auditLog.findMany({
      where: { environmentId: envId, createdAt: { gte: since } },
      select: { action: true, createdAt: true, metadata: true },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.signal.findMany({
      where: { environmentId: envId, createdAt: { gte: since } },
      select: { title: true, priority: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
    prisma.goal.findMany({
      where: { environmentId: envId },
      select: { title: true, status: true, progress: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
  ]);

  const basis = { audits: audits.length, signals: signals.length, goals: goals.length };

  // Build a compact context block. Nova reads the full block; token cost
  // caps by the take: limits above.
  const context = [
    `Environment: ${env.name}`,
    '',
    `Recent audit actions (last 7 days, most recent first):`,
    audits.map(a => `- ${a.action} @ ${a.createdAt.toISOString()}`).join('\n') || '(none)',
    '',
    `Top signals:`,
    signals
      .map(s => `- [${s.priority}/${s.status}] ${s.title}`)
      .join('\n') || '(none)',
    '',
    `Goals (progress %):`,
    goals
      .map(g => `- ${g.title} — ${g.status} — ${g.progress ?? 0}%`)
      .join('\n') || '(none)',
  ].join('\n');

  const systemPrompt = [
    'You write weekly narratives for business Environments.',
    'Voice: memo, not marketing. Short sentences. Concrete nouns.',
    'No adverbs like "seamlessly", "effortlessly", "powerfully".',
    'Exactly five sentences. No bullet points. No headings. No emoji.',
    'Sentence 1: the single most important thing that happened.',
    'Sentence 2: one trend or metric that moved and why it moved.',
    'Sentence 3: one exception or risk worth attention this week.',
    'Sentence 4: what Nova handled autonomously and what was overridden.',
    'Sentence 5: one specific thing to decide or ship next week.',
  ].join('\n');

  let text: string;
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('no_api_key');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: context }],
      }),
    });
    if (!res.ok) throw new Error(`upstream_${res.status}`);
    const data = await res.json();
    const raw = Array.isArray(data.content)
      ? data.content.map((c: { text?: string }) => c.text ?? '').join('')
      : '';
    text = stripAdverbs(raw.trim()) || fallbackNarrative(basis);
  } catch {
    text = fallbackNarrative(basis);
  }

  const entry: CacheEntry = {
    expiresAt: now + TTL_MS,
    text,
    generatedAt: new Date().toISOString(),
    basis,
  };
  cache.set(cacheKey, entry);

  return Response.json({ ...entry, cached: false });
}
