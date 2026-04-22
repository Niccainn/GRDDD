/**
 * Project planner — turns a natural-language goal into a concrete
 * step-by-step plan Nova can execute.
 *
 * Uses Claude (haiku model) to select skills from the registry and
 * order them. Falls back to a deterministic template plan if no
 * Anthropic key is configured, so dev/demo flows still work.
 *
 * Output: an unstarted Step[] array plus an opening TraceEntry.
 */

import { randomUUID } from 'node:crypto';
import type { Step, TraceEntry, ToolSlug } from './types';
import { SKILLS, skillMenuForPrompt, findSkill } from '@/lib/skills/registry';
import { classifierFromLegacyId } from '@/lib/skills/taxonomy';

const MAX_STEPS = 12;

function heuristicPlan(goal: string): Step[] {
  const g = goal.toLowerCase();
  const steps: Step[] = [];

  let idx = 1;
  const push = (title: string, tool: ToolSlug, action: string, rationale: string, approve = false) => {
    const classifier = classifierFromLegacyId(action);
    // Gate steps that default to approval get interaction updated so
    // the UI badges and the auto-runner stay consistent.
    if (approve) {
      classifier.interaction = 'approve_before_executing';
      classifier.execution = 'auto_on_approval';
    }
    steps.push({
      id: idx++,
      title,
      rationale,
      tool,
      action,
      classifier,
      status: 'pending',
      approval: approve ? { approvalRequestId: null, required: true, reason: 'User-visible artifact; default HITL gate.' } : undefined,
    });
  };

  if (g.includes('brand') || g.includes('logo') || g.includes('identity')) {
    push('Read the brief', 'notion', 'notion.fetch_document', 'Anchor the plan in whatever the team already wrote.');
    push('Draft brand voice summary', 'claude', 'claude.summarize', 'So every downstream step inherits the same voice.');
    push('Create Figma file and logo explorations', 'figma', 'figma.create_logo_explorations', 'Three explorations, layered, named, exportable.', true);
    push('Human review of explorations', 'human', 'human.review', 'Pick one direction before we go deep.', true);
    push('Export approved logo in PNG + SVG', 'figma', 'figma.export_asset', 'Production-ready assets.');
    push('Upload to Notion asset library', 'notion', 'notion.upload_asset', 'So the team finds the canonical logo in one place.');
    push('Post to Slack #design', 'slack', 'slack.post_message', 'Close the loop with the team.');
    return steps;
  }

  if (g.includes('meta') || g.includes('ad ') || g.includes('campaign')) {
    push('Pull creative brief from Notion', 'notion', 'notion.fetch_document', 'Campaign inherits the positioning already agreed.');
    push('Draft three headline + body copy variants', 'claude', 'claude.draft_copy', 'Three variants so the user picks, Nova learns which wins.');
    push('Design static + story ad in Canva', 'canva', 'canva.create_design', 'On-brand creative pulled from the brand kit.', true);
    push('Human review of creative', 'human', 'human.review', 'Visual approval before spend.', true);
    push('Draft Meta ad campaign', 'meta_ads', 'meta_ads.draft_campaign', 'Campaign + ad set + creative — drafted, not launched.', true);
    push('Send summary email for final approval', 'gmail', 'gmail.draft_email', 'Stakeholder sees the whole package in one email.', true);
    return steps;
  }

  if (g.includes('onboard') || g.includes('client')) {
    push('Generate intake summary from form', 'claude', 'claude.summarize', 'Condense the client intake into a one-page brief.');
    push('Create Notion project page', 'notion', 'notion.create_page', 'Home for everything related to this client.');
    push('Draft kickoff calendar invite', 'google_calendar', 'google_calendar.draft_event', 'Calendar proposal before we commit times.');
    push('Human review of kickoff', 'human', 'human.review', 'Make sure the attendees and agenda are right.', true);
    push('Draft kickoff email', 'gmail', 'gmail.draft_email', 'Warm intro, brief attached.', true);
    return steps;
  }

  // Generic fallback.
  push('Summarize the goal', 'claude', 'claude.summarize', 'Make the goal concrete before acting.');
  push('Draft working document', 'notion', 'notion.create_page', 'Give the project a home.');
  push('Human review', 'human', 'human.review', 'Check alignment before we proceed.', true);
  return steps;
}

export async function planProject(goal: string): Promise<{ plan: Step[]; source: 'nova' | 'heuristic' | 'fallback'; openingTrace: TraceEntry }> {
  const now = new Date().toISOString();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      plan: heuristicPlan(goal),
      source: 'heuristic',
      openingTrace: {
        at: now,
        stepId: null,
        source: 'nova',
        message: `Plan built from a template because no Claude key is configured. ${heuristicPlan(goal).length} steps.`,
      },
    };
  }

  const systemPrompt = [
    'You are Nova, a business operator that plans multi-tool projects.',
    'Given a natural-language goal, return a JSON array of 3–10 steps using only skill ids from the menu.',
    '',
    'Each step MUST be:',
    '{ "id": number, "title": string (<= 70 chars), "rationale": string (1 sentence), "skillId": string, "requiresApproval": boolean }',
    '',
    'Rules:',
    '- Use skillId exactly as it appears in the menu. Do not invent ids.',
    '- Include a "human.review" step before any action that emits public-facing output (ad campaigns, emails, assets).',
    '- Keep the plan under 10 steps.',
    '- Voice: memo, not marketing. Rationale is one honest sentence.',
    '',
    'Return ONLY the JSON array — no prose, no markdown fences.',
    '',
    'Available skills:',
    skillMenuForPrompt(),
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
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Goal: ${goal}` }],
      }),
    });
    if (!r.ok) throw new Error(`upstream_${r.status}`);
    const data = await r.json();
    const raw: string = Array.isArray(data.content)
      ? data.content.map((c: { text?: string }) => c.text ?? '').join('')
      : '';
    const firstBracket = raw.indexOf('[');
    const lastBracket = raw.lastIndexOf(']');
    const jsonSlice = firstBracket >= 0 ? raw.slice(firstBracket, lastBracket + 1) : raw;
    const parsed = JSON.parse(jsonSlice) as Array<{
      id: number;
      title: string;
      rationale: string;
      skillId: string;
      requiresApproval: boolean;
    }>;
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('empty');

    const plan: Step[] = parsed.slice(0, MAX_STEPS).map((s, i) => {
      const skill = findSkill(s.skillId) ?? SKILLS[0];
      const classifier = classifierFromLegacyId(skill.id);
      const gated = s.requiresApproval || skill.requiresApprovalByDefault;
      if (gated) {
        classifier.interaction = 'approve_before_executing';
        classifier.execution = 'auto_on_approval';
      }
      return {
        id: i + 1,
        title: s.title.slice(0, 80),
        rationale: s.rationale,
        tool: skill.tool,
        action: skill.id,
        classifier,
        status: 'pending',
        approval: gated
          ? {
              approvalRequestId: null,
              required: true,
              reason: 'Default HITL gate on a user-visible output.',
            }
          : undefined,
      };
    });

    return {
      plan,
      source: 'nova',
      openingTrace: {
        at: now,
        stepId: null,
        source: 'nova',
        message: `Nova planned ${plan.length} steps across ${new Set(plan.map(p => p.tool)).size} tools.`,
      },
    };
  } catch {
    const plan = heuristicPlan(goal);
    return {
      plan,
      source: 'fallback',
      openingTrace: {
        at: now,
        stepId: null,
        source: 'nova',
        message: `Claude could not plan this run; used a template of ${plan.length} steps. Open the trace to edit.`,
      },
    };
  }
}

export function newProjectId(): string {
  return randomUUID();
}
