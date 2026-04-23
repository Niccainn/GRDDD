/**
 * /capabilities — what GRID is actually running on Claude.
 *
 * Public page for partners and curious engineers. Each row lists a
 * Claude / Anthropic stack capability, the production surface in
 * GRID that uses it, and the one-line honest note on how. No
 * roadmap bullshit — everything listed is either running today or
 * explicitly marked as staged.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

export const metadata: Metadata = {
  title: 'Capabilities — GRID',
  description:
    'What GRID actually runs on Claude today: long context, sub-agents, tool use, streaming, interpretability. One row per capability, one surface where it lives, one honest sentence about how.',
};

type Row = {
  capability: string;
  surfaceName: string;
  surfaceRoute: string;
  note: string;
  status: 'live' | 'staged';
};

const ROWS: Row[] = [
  {
    capability: 'Long-context reasoning (≥ 100k tokens per call)',
    surfaceName: 'Weekly narrative',
    surfaceRoute: '/environments/[slug]',
    note:
      'The 5-sentence Monday memo composes 7 days of AuditLog + signals + goal deltas into one Claude call. One round trip, one memo. Cached 24h.',
    status: 'live',
  },
  {
    capability: 'Sub-agent dispatch (specialist per task)',
    surfaceName: 'Project executor chain',
    surfaceRoute: '/projects/[id]',
    note:
      'A Project plan fans out to 3–10 specialist executors — Notion fetch, Claude draft, Canva design, Gmail draft. Each gets scoped context. Auto-runs until a human gate.',
    status: 'live',
  },
  {
    capability: 'Tool use with structured schemas',
    surfaceName: 'Skill registry',
    surfaceRoute: '/skill-space',
    note:
      '14 real tool adapters and a four-dimensional skill classifier (Location, Action, Interaction, Execution). Claude selects from a menu and emits a JSON plan.',
    status: 'live',
  },
  {
    capability: 'Reasoning-trace exposure',
    surfaceName: 'WhyDrawer on every action',
    surfaceRoute: '/environments/[slug]',
    note:
      'Click any Nova action in the ledger. Drawer shows what Nova read, what tool it called, what it produced, tokens and cost. KernelTrace + IntelligenceLog, no black boxes.',
    status: 'live',
  },
  {
    capability: 'Persistent memory per organization',
    surfaceName: 'Nova Memory + Mastery Insights',
    surfaceRoute: '/memory',
    note:
      'NovaMemory holds user-taught corrections; MasteryInsight holds patterns Nova derived from execution reviews; OperationalPlaybook holds the regenerated "how work actually runs" doc. All org-scoped.',
    status: 'live',
  },
  {
    capability: 'Bidirectional teaching loop (user ↔ model)',
    surfaceName: 'Nova Academy',
    surfaceRoute: '/learn',
    note:
      'Four fluency capabilities (delegation, review, context-giving, trust-calibration) scored from aggregates. Daily lesson biased to the weakest. Every answer writes a NovaMemory entry future Nova calls RAG against.',
    status: 'live',
  },
  {
    capability: 'Streaming build narration (SSE)',
    surfaceName: 'Onboarding build step',
    surfaceRoute: '/welcome',
    note:
      'Nova streams scaffold progress as it creates the System and Workflow. Real steps, real writes, rendered one line at a time.',
    status: 'live',
  },
  {
    capability: 'Reversible autonomous actions',
    surfaceName: '24-hour undo window',
    surfaceRoute: '/environments/[slug]',
    note:
      'Every autonomous action gets an AuditLog undo path and a NovaMemory user_correction on reversal. Future Nova calls factor in the correction.',
    status: 'live',
  },
  {
    capability: 'Calibrated autonomy (5 levels)',
    surfaceName: 'AutonomyConfig per Workflow',
    surfaceRoute: '/approvals',
    note:
      'Observe → Suggest → Act & Notify → Autonomous → Self-Direct, per Workflow and per System. Trust Score recalibrates from approval rate.',
    status: 'live',
  },
  {
    capability: 'Override reason capture (structured)',
    surfaceName: 'Teach Nova pill row',
    surfaceRoute: '/environments/[slug]',
    note:
      'Three override categories plus one-line context, per rejected action. Written to NovaMemory as type=user_correction with category set.',
    status: 'live',
  },
  {
    capability: 'Prompt caching (cost shape)',
    surfaceName: 'Narrative + planner calls',
    surfaceRoute: 'server-side',
    note:
      'System prompts are structured so the static prefix is cache-friendly. Cache adoption is a continuing optimization, flagged here so partners know we track it.',
    status: 'staged',
  },
  {
    capability: 'MCP-compatible tool contract',
    surfaceName: 'Skill adapter shape',
    surfaceRoute: 'lib/skills/executors/',
    note:
      'Every tool adapter implements a single Executor interface (step, project) → ExecutorResult with artifacts, trace, mode. Maps cleanly to MCP when we expose it externally.',
    status: 'staged',
  },
];

const STATUS_META: Record<Row['status'], { label: string; color: string; bg: string; border: string }> = {
  live: { label: 'Live', color: '#C8F26B', bg: 'rgba(200,242,107,0.08)', border: 'rgba(200,242,107,0.2)' },
  staged: { label: 'Staged', color: '#F5D76E', bg: 'rgba(245,215,110,0.08)', border: 'rgba(245,215,110,0.2)' },
};

export default function CapabilitiesPage() {
  return (
    <div className="min-h-screen px-5 md:px-8 py-20 md:py-28">
      <div className="max-w-3xl mx-auto">
        <p
          className="text-[10px] tracking-[0.16em] uppercase mb-3 font-light"
          style={{ color: 'var(--text-3)' }}
        >
          Capabilities · Built on Claude
        </p>
        <h1 className="text-3xl md:text-4xl font-extralight tracking-tight mb-4">
          What GRID runs on Claude today
        </h1>
        <p className="text-sm font-light leading-relaxed mb-12" style={{ color: 'var(--text-2)' }}>
          One row per capability, one production surface where it lives, one honest
          sentence about how. Everything marked <strong style={{ color: '#C8F26B' }}>Live</strong> is
          running in the product now; <strong style={{ color: '#F5D76E' }}>Staged</strong> means the
          scaffolding is wired and the optimization is in progress.
        </p>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          {ROWS.map((r, i) => {
            const meta = STATUS_META[r.status];
            return (
              <div
                key={r.capability}
                className="px-5 py-5"
                style={{
                  borderBottom:
                    i < ROWS.length - 1 ? '1px solid var(--glass-border)' : 'none',
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>
                      {r.capability}
                    </p>
                    <Link
                      href={r.surfaceRoute.replace('/[slug]', '').replace('/[id]', '')}
                      className="text-[11px] font-light inline-flex items-center gap-1.5"
                      style={{ color: 'var(--text-3)' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--brand)' }} />
                      {r.surfaceName} · <span className="font-mono">{r.surfaceRoute}</span>
                    </Link>
                  </div>
                  <span
                    className="text-[10px] font-light tracking-wider uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {r.note}
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] font-light mt-8" style={{ color: 'var(--text-3)' }}>
          The architecture brief that expands every row lives at{' '}
          <Link href="/security/architecture" style={{ color: 'var(--brand)' }}>
            /security/architecture
          </Link>
          . The roadmap for what comes next lives at{' '}
          <Link href="/roadmap" style={{ color: 'var(--brand)' }}>
            /roadmap
          </Link>
          .
        </p>
      </div>
      <LegalFooter />
    </div>
  );
}
