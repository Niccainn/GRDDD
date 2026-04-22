/**
 * claude.* executors — pure LLM reasoning with no external tool
 * side-effects. Outputs persist back into the project's artifact
 * list so the user can click through and read what Nova produced.
 */

import { randomUUID } from 'node:crypto';
import type { Executor, ExecutorResult } from './types';
import type { Artifact } from '@/lib/projects/types';

const MODEL = 'claude-3-5-haiku-latest';
const APPROX_COST_PER_1K_TOKENS = 0.001; // Haiku pricing, rough

async function callClaude(
  systemPrompt: string,
  userText: string,
  maxTokens = 600,
): Promise<{ text: string; tokens: number; cost: number } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userText }],
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const text: string = Array.isArray(data.content)
      ? data.content.map((c: { text?: string }) => c.text ?? '').join('')
      : '';
    const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);
    const cost = (tokens / 1000) * APPROX_COST_PER_1K_TOKENS;
    return { text: text.trim(), tokens, cost };
  } catch {
    return null;
  }
}

const SUMMARIZE_SYSTEM = [
  'You are Nova, writing in the house memo voice.',
  'Short sentences. Concrete nouns. No adverbs like "seamlessly".',
  'Return plain text — no markdown headers, no bullets unless asked.',
].join('\n');

export const summarize: Executor = async ({ step, project }) => {
  const context = [
    `Project goal: ${project.goal}`,
    `Step: ${step.title}`,
    `Rationale: ${step.rationale}`,
    '',
    'Prior steps already completed:',
    project.plan
      .filter(s => s.status === 'done')
      .map(s => `  - ${s.title}`)
      .join('\n') || '  (none yet)',
  ].join('\n');

  const result = await callClaude(SUMMARIZE_SYSTEM, context, 500);
  const now = new Date().toISOString();

  if (!result) {
    // Deterministic fallback so the flow completes without a key.
    const artifact: Artifact = {
      id: randomUUID(),
      name: `${step.title} — Nova memo`,
      kind: 'document',
      tool: 'claude',
      url: null,
      createdAt: now,
    };
    return {
      step: { ...step, status: 'done', completedAt: now, outputs: { summary: 'Claude key absent — demo mode.' } },
      artifacts: [artifact],
      trace: [
        { stepId: step.id, source: 'nova', message: `Summarized (demo mode — no Claude key). Artifact saved.` },
      ],
      mode: 'simulated',
    };
  }

  const artifact: Artifact = {
    id: randomUUID(),
    name: `${step.title} — Nova memo`,
    kind: 'document',
    tool: 'claude',
    url: null,
    createdAt: now,
  };

  return {
    step: { ...step, status: 'done', completedAt: now, outputs: { summary: result.text } },
    artifacts: [artifact],
    trace: [
      { stepId: step.id, source: 'nova', message: `Composed ${result.tokens.toLocaleString()} tokens into a memo.` },
    ],
    mode: 'reasoning',
    cost: { tokens: result.tokens, usd: result.cost },
  };
};

const DRAFT_COPY_SYSTEM = [
  'You are Nova, drafting short-form copy for marketing, product, or brand.',
  'Return three distinct options separated by a blank line.',
  'Each option: at most two sentences. Concrete language. No hype words.',
  'Voice: the house memo — matter-of-fact, operator-grade.',
].join('\n');

export const draftCopy: Executor = async ({ step, project }) => {
  const prompt = `Goal: ${project.goal}\nStep: ${step.title}\nRationale: ${step.rationale}`;
  const result = await callClaude(DRAFT_COPY_SYSTEM, prompt, 600);
  const now = new Date().toISOString();
  const text = result?.text ?? 'Option A. Concrete draft one.\n\nOption B. Concrete draft two.\n\nOption C. Concrete draft three.';

  const artifact: Artifact = {
    id: randomUUID(),
    name: `${step.title} — three drafts`,
    kind: 'document',
    tool: 'claude',
    url: null,
    createdAt: now,
  };

  return {
    step: { ...step, status: 'done', completedAt: now, outputs: { drafts: text } },
    artifacts: [artifact],
    trace: [
      {
        stepId: step.id,
        source: 'nova',
        message: result ? `Drafted three copy variants (${result.tokens} tokens).` : 'Drafted three copy variants (demo mode).',
      },
    ],
    mode: result ? 'reasoning' : 'simulated',
    cost: result ? { tokens: result.tokens, usd: result.cost } : undefined,
  };
};
