/**
 * Scaffold feedback loop.
 *
 * Turns accept/edit/reject deltas into MasteryInsight rows, and reads
 * them back into the next scaffold prompt so Nova's second attempt is
 * shaped by the first one's corrections. Per-tenant — no cross-tenant
 * leakage by construction.
 */

import type { ScaffoldSpec } from './spec';

export type ScaffoldFeedback = {
  principle: string;   // short, one-line takeaway Nova can consume next time
  evidence: string;    // specific diff that produced the takeaway
  strength: number;    // 0 = weak signal, 1 = strong (accepted as-is)
};

/**
 * Diff an accepted spec against the original draft. Returns null when
 * there's nothing interesting to learn from (no original, or the
 * caller didn't send one — then we don't force-create a noise row).
 */
export function summarizeScaffoldFeedback(
  original: ScaffoldSpec | undefined,
  accepted: ScaffoldSpec,
  prompt: string | null,
): ScaffoldFeedback | null {
  const promptFragment = prompt ? `"${prompt.slice(0, 120).replace(/"/g, "'")}"` : '(no prompt recorded)';

  // No original → user accepted the draft as-is. Lower strength
  // because "no edits" can mean "perfect" or "too lazy to review."
  if (!original) {
    return {
      principle: `For ${promptFragment}, Nova's first draft was accepted unchanged: ${accepted.systems.length} systems, ${accepted.workflows.length} workflows.`,
      evidence: summarizeSpec(accepted),
      strength: 0.55,
    };
  }

  const diffs: string[] = [];

  // System-level edits
  const originalSystemNames = new Set(original.systems.map(s => s.name));
  const acceptedSystemNames = new Set(accepted.systems.map(s => s.name));
  const addedSystems = [...acceptedSystemNames].filter(n => !originalSystemNames.has(n));
  const removedSystems = [...originalSystemNames].filter(n => !acceptedSystemNames.has(n));
  if (addedSystems.length) diffs.push(`added systems: ${addedSystems.join(', ')}`);
  if (removedSystems.length) diffs.push(`removed systems: ${removedSystems.join(', ')}`);

  // Workflow count drift
  if (original.workflows.length !== accepted.workflows.length) {
    diffs.push(
      `workflow count went ${original.workflows.length} → ${accepted.workflows.length}`,
    );
  }

  // Widget set drift
  const origW = new Set(original.widgets.map(w => w.widget));
  const accW = new Set(accepted.widgets.map(w => w.widget));
  const addedWidgets = [...accW].filter(w => !origW.has(w));
  const removedWidgets = [...origW].filter(w => !accW.has(w));
  if (addedWidgets.length) diffs.push(`added widgets: ${addedWidgets.join(', ')}`);
  if (removedWidgets.length) diffs.push(`removed widgets: ${removedWidgets.join(', ')}`);

  // No drift = accepted verbatim but we had the original object — same case as above.
  if (diffs.length === 0) {
    return {
      principle: `For ${promptFragment}, Nova's draft was accepted unchanged.`,
      evidence: summarizeSpec(accepted),
      strength: 0.6,
    };
  }

  // Strong correction signal when the user reshaped the cell.
  const strength = Math.min(0.95, 0.4 + diffs.length * 0.1);
  return {
    principle: `For prompts like ${promptFragment}, correct Nova's instinct: ${diffs.join('; ')}.`,
    evidence: `Original: ${summarizeSpec(original)}\nAccepted: ${summarizeSpec(accepted)}`,
    strength,
  };
}

function summarizeSpec(s: ScaffoldSpec): string {
  return [
    `${s.systems.length} systems (${s.systems.map(x => x.name).join(', ')})`,
    `${s.workflows.length} workflows`,
    `${s.signals.length} signals`,
    `${s.widgets.length} widgets`,
  ].join(' | ');
}

/**
 * Render prior corrections into a single string the generator injects
 * into Nova's system prompt. Caps length so repeated corrections don't
 * blow the context window.
 */
export function renderPriorCorrections(
  insights: Array<{ principle: string; strength: number; createdAt: Date }>,
  maxChars = 1200,
): string {
  if (!insights.length) return '';
  const lines = insights
    .slice() // don't mutate caller's array
    .sort((a, b) => b.strength - a.strength || b.createdAt.getTime() - a.createdAt.getTime())
    .map(i => `- [${i.strength.toFixed(2)}] ${i.principle}`)
    .join('\n');
  if (lines.length <= maxChars) return lines;
  return lines.slice(0, maxChars) + '\n- (…older corrections truncated)';
}
