'use client';

/**
 * PostureIntro — the 15-second screen that teaches the reviewer
 * posture before any wedge or interview question.
 *
 * The triadic gap closes here. Without this screen, a new user lands
 * on /welcome with the doer reflex intact — they expect a list to
 * make, a task to create, a thing to type. The wizard then walks
 * them through configuring inputs to a system, reinforcing the
 * "I am the operator" frame.
 *
 * This screen tells them, before any of that:
 *   "GRID isn't a place where you make tasks. It's a place where
 *    Atrium ships work and you review it. Three things you'll do
 *    here: review · calibrate · teach."
 *
 * One CTA. One screen. ~15 seconds of reading. Then the existing
 * interview / wedge flow takes over with the right muscle memory
 * already loaded.
 */

import { useState } from 'react';

type Props = {
  onContinue: () => void;
};

const VERBS: { label: string; body: string; color: string }[] = [
  {
    label: 'Review',
    body: 'Atrium reads, decides, and ships drafts. You review them — accept, override, or adjust.',
    color: '#C8F26B',
  },
  {
    label: 'Calibrate',
    body: 'Each system has a trust dial. You set how much Atrium can do without asking — and tighten or loosen it as trust earns its way up.',
    color: '#7193ED',
  },
  {
    label: 'Teach',
    body: 'Every override becomes memory. The system reads your corrections on the next call. The longer you run GRID, the more it sounds like you.',
    color: '#BF9FF1',
  },
];

export default function PostureIntro({ onContinue }: Props) {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      className="max-w-2xl mx-auto px-4 md:px-0"
      style={{ animation: 'fadeIn 0.4s ease-out' }}
    >
      <p
        className="text-[10px] tracking-[0.24em] uppercase font-light mb-6"
        style={{ color: 'var(--text-3)' }}
      >
        Before we begin
      </p>

      <h1
        className="text-2xl md:text-3xl font-extralight tracking-tight leading-[1.15] mb-4"
        style={{ color: 'var(--text-1)' }}
      >
        GRID isn&apos;t a place where you make tasks.
      </h1>
      <h2
        className="text-2xl md:text-3xl font-extralight tracking-tight leading-[1.15] mb-8"
        style={{ color: '#C8F26B' }}
      >
        It&apos;s a place where Atrium ships work and you review it.
      </h2>

      <p
        className="text-sm font-light leading-relaxed mb-8 max-w-xl"
        style={{ color: 'var(--text-2)' }}
      >
        Three verbs, every day. Same role title — deeper craft.
      </p>

      <div className="grid gap-3 mb-10">
        {VERBS.map(v => (
          <div
            key={v.label}
            className="rounded-xl p-4 flex items-start gap-4"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
              style={{ background: v.color, boxShadow: `0 0 8px ${v.color}66` }}
            />
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-light mb-1"
                style={{ color: v.color, letterSpacing: '0.02em' }}
              >
                {v.label}
              </p>
              <p
                className="text-xs font-light leading-relaxed"
                style={{ color: 'var(--text-3)' }}
              >
                {v.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p
          className="text-[11px] font-light"
          style={{ color: 'var(--text-3)' }}
        >
          You can change any of this later. Nothing is locked.
        </p>
        <button
          type="button"
          onClick={() => {
            setPressed(true);
            // Brief pause for the press affordance, then advance.
            setTimeout(onContinue, 180);
          }}
          disabled={pressed}
          className="text-sm font-light px-6 py-3 rounded-full transition-all"
          style={{
            background: pressed ? 'rgba(200,242,107,0.2)' : '#C8F26B',
            color: '#000',
            opacity: pressed ? 0.7 : 1,
          }}
        >
          {pressed ? 'Loading…' : 'Got it — show me how it works →'}
        </button>
      </div>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
