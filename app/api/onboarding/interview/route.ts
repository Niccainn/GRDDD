/**
 * POST /api/onboarding/interview
 *
 * Takes the five interview answers, asks Claude to propose a System,
 * three Goals, and one starter Workflow. Returns the proposal as a
 * JSON object the UI renders for edit-and-confirm. No mutation yet —
 * the user confirms, then the existing build stream actually creates
 * records.
 *
 * Graceful fallback: if ANTHROPIC_API_KEY is absent, propose a
 * deterministic starter set based on keyword heuristics so the flow
 * still completes in local dev.
 */

import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { INTERVIEW_QUESTIONS } from '@/lib/learn/interview-questions';

export type Proposal = {
  system: { name: string; description: string; color: string };
  goals: { title: string; metric: string; target: string }[];
  workflow: { name: string; stages: string[] };
  escalationRule: string;
  summaryForUser: string;
};

const PALETTE = ['#7193ED', '#BF9FF1', '#C8F26B', '#F5D76E', '#E879F9', '#6395FF', '#FF8C69', '#15AD70'];

function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function heuristicProposal(answers: Record<string, string>): Proposal {
  const joined = Object.values(answers).join(' ').toLowerCase();

  // Very cheap keyword routing so dev/offline mode still gives
  // something meaningful rather than a generic stub.
  let systemName = 'Operations';
  let systemDesc = 'The repeating work Nova runs alongside you.';
  if (joined.includes('email') || joined.includes('inbox') || joined.includes('mail')) {
    systemName = 'Inbox Triage';
    systemDesc = 'Sorts mail, drafts replies, surfaces what needs a human.';
  } else if (joined.includes('customer') || joined.includes('support') || joined.includes('ticket')) {
    systemName = 'Customer Care';
    systemDesc = 'Watches support surfaces, flags churn risk, drafts responses.';
  } else if (joined.includes('invoice') || joined.includes('billing') || joined.includes('receipt')) {
    systemName = 'Bookkeeping';
    systemDesc = 'Captures receipts and categorizes spend before month-end.';
  } else if (joined.includes('calendar') || joined.includes('meeting')) {
    systemName = 'Calendar Defense';
    systemDesc = 'Declines low-value invites and protects focus time.';
  } else if (joined.includes('content') || joined.includes('post') || joined.includes('publish')) {
    systemName = 'Content Engine';
    systemDesc = 'Moves pieces from brief to publish on a weekly cadence.';
  }

  return {
    system: {
      name: systemName,
      description: systemDesc,
      color: pickColor(systemName),
    },
    goals: [
      {
        title: `Cut ${systemName.toLowerCase()} time by half in 12 weeks`,
        metric: 'Hours saved per week',
        target: '10',
      },
      {
        title: 'Keep override rate below 20%',
        metric: 'Override rate (%)',
        target: '20',
      },
      {
        title: `Zero missed ${answers.cracks ? 'escalations' : 'exceptions'} this quarter`,
        metric: 'Missed exceptions',
        target: '0',
      },
    ],
    workflow: {
      name: `${systemName}: triage → act → review`,
      stages: ['Read inbound', 'Classify + draft', 'Surface to human for review'],
    },
    escalationRule:
      answers.fired ||
      'Anything involving a customer who has complained in the last 30 days is escalated to you, not handled automatically.',
    summaryForUser:
      `Based on what you said, I'd start with a ${systemName} system. ` +
      `The weekly focus is on what you named as hateful and recurring — the stuff on Monday morning. ` +
      `I'll escalate the red lines you drew (see the rule below) and track three goals against it.`,
  };
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const answers: Record<string, string> = {};
  for (const q of INTERVIEW_QUESTIONS) {
    const v = body?.[q.id];
    answers[q.id] = typeof v === 'string' ? v.trim() : '';
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ proposal: heuristicProposal(answers), source: 'heuristic' });
  }

  const systemPrompt = [
    'You are Nova, an operations-minded business agent doing an onboarding interview.',
    'You just got five short answers from a new user about their work.',
    'Propose a starter setup: one System, three Goals, one starter Workflow, and one escalation rule.',
    'Return ONLY valid JSON matching the schema provided. No markdown, no commentary.',
    '',
    'Voice: memo, not marketing. No adverbs like "seamlessly", "effortlessly", "powerfully".',
    'Concrete nouns. Short sentences. The summary field should read like a single paragraph a department head would sign off on.',
    '',
    'Schema (exact field names):',
    '{',
    '  "system": { "name": string, "description": string, "color": "#xxxxxx" },',
    '  "goals": [ { "title": string, "metric": string, "target": string } ] (exactly 3),',
    '  "workflow": { "name": string, "stages": string[] } (3-5 stages),',
    '  "escalationRule": string (one sentence),',
    '  "summaryForUser": string (2-4 sentences)',
    '}',
  ].join('\n');

  const userText = INTERVIEW_QUESTIONS.map(
    q => `Q: ${q.prompt}\nA: ${answers[q.id] || '(no answer)'}`,
  ).join('\n\n');

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
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: userText }],
      }),
    });
    if (!r.ok) throw new Error(`upstream_${r.status}`);
    const data = await r.json();
    const raw: string = Array.isArray(data.content)
      ? data.content.map((c: { text?: string }) => c.text ?? '').join('')
      : '';
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    const jsonSlice = firstBrace >= 0 ? raw.slice(firstBrace, lastBrace + 1) : raw;
    const parsed = JSON.parse(jsonSlice) as Proposal;
    // Quick sanity: if Nova forgot a field, fall back to heuristic.
    if (!parsed?.system?.name || !Array.isArray(parsed.goals) || parsed.goals.length < 1) {
      throw new Error('bad_shape');
    }
    return Response.json({ proposal: parsed, source: 'nova' });
  } catch {
    return Response.json({ proposal: heuristicProposal(answers), source: 'fallback' });
  }
}
