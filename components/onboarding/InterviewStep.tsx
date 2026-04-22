'use client';

/**
 * InterviewStep — the five-question onboarding interview.
 *
 * Replaces the blank-prompt problem ("describe your work"). After
 * the user fills the five fields, Nova proposes a starter System,
 * Goals, and Workflow. The proposal is editable before the user
 * commits to the build.
 */

import { useMemo, useState } from 'react';
import { INTERVIEW_QUESTIONS } from '@/lib/learn/interview-questions';

type Proposal = {
  system: { name: string; description: string; color: string };
  goals: { title: string; metric: string; target: string }[];
  workflow: { name: string; stages: string[] };
  escalationRule: string;
  summaryForUser: string;
};

type Props = {
  onProposal: (p: Proposal) => void;
  onSkipToTemplates: () => void;
};

export default function InterviewStep({ onProposal, onSkipToTemplates }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [source, setSource] = useState<'nova' | 'heuristic' | 'fallback' | null>(null);
  const [error, setError] = useState('');

  const canContinue = useMemo(
    () => INTERVIEW_QUESTIONS.every(q => (answers[q.id] ?? '').trim().length >= 4),
    [answers],
  );

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      });
      if (!res.ok) {
        setError('Nova could not shape the answers right now. Try again or use a template.');
        return;
      }
      const data = await res.json();
      setProposal(data.proposal);
      setSource(data.source ?? 'fallback');
    } finally {
      setSubmitting(false);
    }
  }

  if (proposal) {
    return (
      <div className="w-full">
        <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-2" style={{ color: 'var(--text-3)' }}>
          {source === 'nova' ? "Nova's proposal" : 'Starter proposal'}
        </p>
        <h1 className="text-2xl md:text-3xl font-extralight tracking-tight mb-3" style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
          Here's what I heard
        </h1>
        <p className="text-sm font-light leading-relaxed mb-6" style={{ color: 'var(--text-2)' }}>
          {proposal.summaryForUser}
        </p>

        <section
          className="rounded-2xl p-5 mb-4"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: proposal.system.color }}
            />
            <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
              {proposal.system.name}
            </p>
            <span className="ml-auto text-[10px] tracking-wider uppercase font-light" style={{ color: 'var(--text-3)' }}>
              System
            </span>
          </div>
          <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
            {proposal.system.description}
          </p>
        </section>

        <section
          className="rounded-2xl p-5 mb-4"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-3" style={{ color: 'var(--text-3)' }}>
            Goals
          </p>
          <div className="space-y-2">
            {proposal.goals.map((g, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: '#C8F26B' }}
                />
                <span className="text-xs font-light flex-1" style={{ color: 'var(--text-1)' }}>
                  {g.title}
                </span>
                <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                  {g.metric} → {g.target}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section
          className="rounded-2xl p-5 mb-4"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-3" style={{ color: 'var(--text-3)' }}>
            Starter workflow — {proposal.workflow.name}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {proposal.workflow.stages.map((s, i) => (
              <span
                key={i}
                className="text-[11px] font-light px-2.5 py-1 rounded-full"
                style={{
                  background: 'rgba(113,147,237,0.06)',
                  border: '1px solid rgba(113,147,237,0.18)',
                  color: 'var(--text-2)',
                }}
              >
                {i + 1}. {s}
              </span>
            ))}
          </div>
        </section>

        <section
          className="rounded-2xl p-5 mb-8"
          style={{
            background: 'rgba(255,107,107,0.04)',
            border: '1px solid rgba(255,107,107,0.18)',
          }}
        >
          <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-2" style={{ color: '#FF8C8C' }}>
            Escalation rule
          </p>
          <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
            {proposal.escalationRule}
          </p>
        </section>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setProposal(null)}
            className="text-sm font-light px-5 py-2.5 rounded-xl"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-2)',
            }}
          >
            ← Edit answers
          </button>
          <button
            onClick={() => onProposal(proposal)}
            className="text-sm font-light px-6 py-2.5 rounded-xl"
            style={{
              background: 'rgba(200,242,107,0.15)',
              border: '1px solid rgba(200,242,107,0.3)',
              color: '#C8F26B',
            }}
          >
            Build this →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-2" style={{ color: 'var(--text-3)' }}>
        Interview · five short answers
      </p>
      <h1 className="text-2xl md:text-3xl font-extralight tracking-tight mb-3" style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
        Tell Nova about your work
      </h1>
      <p className="text-sm font-light leading-relaxed mb-6" style={{ color: 'var(--text-2)' }}>
        One sentence per question. Nova reads these once and uses them forever — so be specific, not polished.
      </p>

      <div className="space-y-5 mb-6">
        {INTERVIEW_QUESTIONS.map(q => (
          <div key={q.id}>
            <label className="text-xs font-light block mb-1.5" style={{ color: 'var(--text-1)' }}>
              {q.prompt}
            </label>
            <textarea
              value={answers[q.id] ?? ''}
              onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              placeholder={q.placeholder}
              rows={2}
              className="w-full text-sm font-light px-4 py-2.5 rounded-xl focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-1)',
                resize: 'vertical',
              }}
            />
            <p className="text-[10px] font-light mt-1" style={{ color: 'var(--text-3)' }}>
              {q.why}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <p
          className="text-xs font-light mb-4 px-3 py-2 rounded-lg"
          style={{
            background: 'rgba(255,107,107,0.06)',
            border: '1px solid rgba(255,107,107,0.18)',
            color: '#FF8C8C',
          }}
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onSkipToTemplates}
          className="text-xs font-light"
          style={{ color: 'var(--text-3)' }}
        >
          Skip the interview — use a template
        </button>
        <button
          onClick={submit}
          disabled={!canContinue || submitting}
          className="text-sm font-light px-6 py-2.5 rounded-xl disabled:opacity-40"
          style={{
            background: 'rgba(200,242,107,0.15)',
            border: '1px solid rgba(200,242,107,0.3)',
            color: '#C8F26B',
          }}
        >
          {submitting ? 'Nova is reading…' : 'Nova, read this →'}
        </button>
      </div>
    </div>
  );
}
