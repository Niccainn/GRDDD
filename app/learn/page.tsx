'use client';

/**
 * /learn — Nova Academy.
 *
 * The user-facing LMS layer. Three surfaces on one page:
 *
 *   1. Today's lesson — one question from Nova. Answering it records
 *      a NovaMemory entry so Nova can use the answer in future
 *      prompts. This is the teaching loop made literal.
 *
 *   2. Fluency grid — four capability scores (delegation, review,
 *      context-giving, trust-calibration). Each has a one-sentence
 *      next step.
 *
 *   3. What Nova has learned about you this week — recent memories
 *      with source = user_input or nova_observation.
 *
 * The page is deliberately quiet: no badges, no streaks, no
 * gamification. The learning is the point; the scoreboard isn't.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type Fluency = {
  overall: number;
  scores: {
    capability: string;
    score: number;
    label: string;
    subtitle: string;
    nextStep: string;
    evidenceCount: number;
  }[];
};

type Lesson = {
  id: string;
  capability: string;
  title: string;
  body: string;
  prompt: string;
  placeholder: string;
};

type Memory = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  source: 'memory' | 'insight';
  environmentName: string | null;
  environmentColor: string | null;
  updatedAt: string;
};

const CAPABILITY_COLORS: Record<string, string> = {
  delegation: '#7193ED',
  review: '#C8F26B',
  'context-giving': '#BF9FF1',
  'trust-calibration': '#F5D76E',
  general: '#E879F9',
};

export default function LearnPage() {
  const [fluency, setFluency] = useState<Fluency | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [recent, setRecent] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    try {
      const [fRes, lRes, mRes] = await Promise.all([
        fetch('/api/learn/fluency').then(r => r.json()),
        fetch('/api/learn/lesson').then(r => r.json()),
        fetch('/api/memory?days=14&limit=12').then(r => r.json()),
      ]);
      setFluency(fRes);
      setLesson(lRes.lesson);
      setRecent(Array.isArray(mRes.items) ? mRes.items : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!lesson || !answer.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/learn/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: lesson.id, answer }),
      });
      if (res.ok) {
        setSubmitted(true);
        setAnswer('');
        // refresh fluency so the context-giving score ticks
        fetch('/api/learn/fluency').then(r => r.json()).then(setFluency);
        fetch('/api/memory?days=14&limit=12').then(r => r.json()).then(d => setRecent(d.items ?? []));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 md:px-10 py-8 md:py-12 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-2" style={{ color: 'var(--text-3)' }}>
          Nova Academy
        </p>
        <h1
          className="text-3xl md:text-4xl font-extralight tracking-tight mb-2"
          style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}
        >
          How you and Nova get fluent together
        </h1>
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
          Every answer you give Nova trains it. Every action Nova takes trains you. Come back here when either of you needs a nudge.
        </p>
        <div className="flex items-center gap-2 mt-4">
          <Link href="/learn/courses"
            className="text-[11px] font-light px-3 py-1.5 rounded-full transition-all"
            style={{ background: 'rgba(191,159,241,0.06)', border: '1px solid rgba(191,159,241,0.2)', color: '#BF9FF1' }}>
            Courses →
          </Link>
          <Link href="/learn/author"
            className="text-[11px] font-light px-3 py-1.5 rounded-full transition-colors hover:bg-white/[0.04]"
            style={{ border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}>
            Author
          </Link>
        </div>
      </div>

      {/* Today's lesson */}
      {loading ? (
        <div className="h-56 rounded-2xl animate-pulse mb-8" style={{ background: 'rgba(255,255,255,0.04)' }} />
      ) : lesson ? (
        <section
          className="rounded-2xl p-6 md:p-8 mb-10"
          style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            boxShadow: `inset 0 0 0 1px ${CAPABILITY_COLORS[lesson.capability] ?? '#BF9FF1'}18`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: CAPABILITY_COLORS[lesson.capability] ?? '#BF9FF1' }}
            />
            <span
              className="text-[10px] font-light tracking-[0.16em] uppercase"
              style={{ color: 'var(--text-3)' }}
            >
              Today's lesson · {lesson.capability.replace('-', ' ')}
            </span>
          </div>
          <h2
            className="text-xl md:text-2xl font-light mb-3"
            style={{ color: 'var(--text-1)', letterSpacing: '-0.01em' }}
          >
            {lesson.title}
          </h2>
          <p className="text-sm font-light leading-relaxed mb-6" style={{ color: 'var(--text-2)' }}>
            {lesson.body}
          </p>
          {submitted ? (
            <div
              className="rounded-xl p-4"
              style={{
                background: 'rgba(200,242,107,0.06)',
                border: '1px solid rgba(200,242,107,0.2)',
              }}
            >
              <p className="text-xs font-light" style={{ color: '#C8F26B' }}>
                Recorded. Nova will use this the next time it acts on your behalf.
              </p>
            </div>
          ) : (
            <>
              <p
                className="text-xs font-light leading-relaxed mb-3"
                style={{ color: 'var(--text-1)' }}
              >
                {lesson.prompt}
              </p>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder={lesson.placeholder}
                rows={3}
                className="w-full text-sm font-light px-4 py-3 rounded-xl focus:outline-none mb-3"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-1)',
                  resize: 'vertical',
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                  One line is enough. Nova reads this — you're teaching, not testing.
                </p>
                <button
                  onClick={submit}
                  disabled={submitting || !answer.trim()}
                  className="text-sm font-light px-5 py-2 rounded-xl disabled:opacity-40"
                  style={{
                    background: 'var(--brand-soft)',
                    border: '1px solid var(--brand-border)',
                    color: 'var(--brand)',
                  }}
                >
                  {submitting ? 'Recording…' : 'Teach Nova →'}
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {/* Fluency grid */}
      {fluency && (
        <section className="mb-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p
                className="text-[10px] tracking-[0.18em] uppercase font-light mb-1"
                style={{ color: 'var(--text-3)' }}
              >
                Your fluency
              </p>
              <p className="text-sm font-light" style={{ color: 'var(--text-2)' }}>
                Overall {fluency.overall} · computed from your last 90 days
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fluency.scores.map(s => {
              const color = CAPABILITY_COLORS[s.capability] ?? '#BF9FF1';
              return (
                <div
                  key={s.capability}
                  className="rounded-2xl p-5"
                  style={{
                    background: 'var(--glass)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
                      {s.capability.replace('-', ' ')}
                    </p>
                    <span
                      className="ml-auto text-[10px] tracking-wider uppercase font-light px-2 py-0.5 rounded-full"
                      style={{
                        color,
                        background: `${color}14`,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div
                    className="h-1 rounded-full overflow-hidden mb-3"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${s.score}%`, background: color }}
                    />
                  </div>
                  <p
                    className="text-[11px] font-light leading-relaxed mb-2"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {s.subtitle}
                  </p>
                  <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
                    {s.nextStep}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* What Nova learned */}
      {recent.length > 0 && (
        <section className="mb-10">
          <div className="flex items-end justify-between mb-4">
            <p
              className="text-[10px] tracking-[0.18em] uppercase font-light"
              style={{ color: 'var(--text-3)' }}
            >
              What Nova has learned
            </p>
            <Link
              href="/memory"
              className="text-[11px] font-light"
              style={{ color: 'var(--text-3)' }}
            >
              Full memory →
            </Link>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
          >
            {recent.map((m, i) => (
              <div
                key={m.id}
                className="px-5 py-4"
                style={{
                  borderBottom: i < recent.length - 1 ? '1px solid var(--glass-border)' : 'none',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: m.environmentColor ?? 'var(--text-3)' }}
                  />
                  <p className="text-sm font-light flex-1 truncate" style={{ color: 'var(--text-1)' }}>
                    {m.title}
                  </p>
                  {m.category && (
                    <span
                      className="text-[10px] font-light tracking-wider uppercase"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {m.category}
                    </span>
                  )}
                </div>
                <p
                  className="text-xs font-light leading-relaxed line-clamp-2"
                  style={{ color: 'var(--text-2)' }}
                >
                  {m.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
