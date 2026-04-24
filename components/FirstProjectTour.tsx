'use client';

/**
 * FirstProjectTour — a three-step, spotlight-style tour that runs
 * once the first time a user lands on a Project run page. Shows:
 *
 *   1. "You typed this"        — highlights the project goal
 *   2. "Nova planned this"     — highlights the step list
 *   3. "You approve here"      — highlights the approval gate
 *
 * Dismissible at any point. Remembers completion in localStorage
 * (`grid:first-project-tour-seen`). Matches the Intercom / Mixpanel
 * tooltip pattern every SaaS user recognizes, adapted to the
 * nervous-system aesthetic — brand-colored spotlight ring, no
 * gradients, no stock illustrations.
 */

import { useEffect, useState } from 'react';

const SEEN_KEY = 'grid:first-project-tour-seen';

type Step = {
  target: string;
  eyebrow: string;
  title: string;
  body: string;
  side: 'top' | 'bottom';
};

const STEPS: Step[] = [
  {
    target: '[data-tour="project-goal"]',
    eyebrow: 'Step 1 · You',
    title: 'You typed this',
    body: 'Nova takes the goal above and plans the work. Every prompt becomes a traceable plan.',
    side: 'bottom',
  },
  {
    target: '[data-tour="project-plan"]',
    eyebrow: 'Step 2 · Nova',
    title: 'Nova planned this',
    body: 'Each step has a tool, a rationale, and a status. Steps run in order; Nova stops at any human gate.',
    side: 'top',
  },
  {
    target: '[data-tour="project-approval"], [data-tour="project-plan"]',
    eyebrow: 'Step 3 · You, again',
    title: 'You approve here',
    body: 'Nothing user-visible ships without you. Every autonomous action has a 24-hour undo. Every override teaches Nova.',
    side: 'top',
  },
];

export default function FirstProjectTour() {
  const [idx, setIdx] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SEEN_KEY) === 'true') return;
    } catch {
      return;
    }
    // Wait a beat for the page to settle before measuring.
    const t = setTimeout(() => setIdx(0), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (idx === null) return;
    const step = STEPS[idx];
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) {
      // Target missing — skip this step.
      next();
      return;
    }
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [idx]);

  function finish() {
    try {
      window.localStorage.setItem(SEEN_KEY, 'true');
    } catch {
      /* non-fatal */
    }
    setIdx(null);
  }

  function next() {
    if (idx === null) return;
    if (idx >= STEPS.length - 1) {
      finish();
      return;
    }
    setIdx(idx + 1);
  }

  if (idx === null || !rect) return null;

  const step = STEPS[idx];
  const pad = 8;
  const spotlight = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
  const tooltipTop =
    step.side === 'bottom'
      ? rect.bottom + pad + 16
      : Math.max(16, rect.top - 180);
  const tooltipLeft = Math.max(16, Math.min(window.innerWidth - 336, rect.left));

  return (
    <>
      {/* Dimmed backdrop with a cut-out over the target element */}
      <div
        className="fixed inset-0 z-[90] pointer-events-none"
        style={{
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          clipPath: `polygon(
            0 0, 100% 0, 100% 100%, 0 100%, 0 0,
            ${spotlight.left}px ${spotlight.top}px,
            ${spotlight.left}px ${spotlight.top + spotlight.height}px,
            ${spotlight.left + spotlight.width}px ${spotlight.top + spotlight.height}px,
            ${spotlight.left + spotlight.width}px ${spotlight.top}px,
            ${spotlight.left}px ${spotlight.top}px
          )`,
        }}
      />
      {/* Spotlight ring */}
      <div
        className="fixed z-[91] pointer-events-none rounded-2xl"
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
          boxShadow: '0 0 0 2px var(--brand), 0 0 0 8px rgba(200,242,107,0.15)',
          transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      {/* Tooltip card */}
      <div
        className="fixed z-[92] rounded-2xl p-5"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: 320,
          background: 'rgba(12,12,18,0.98)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <p
          className="text-[10px] tracking-[0.18em] uppercase font-light mb-2"
          style={{ color: 'var(--brand)' }}
        >
          {step.eyebrow}
        </p>
        <h3 className="text-base font-light mb-2" style={{ color: 'var(--text-1)' }}>
          {step.title}
        </h3>
        <p
          className="text-xs font-light leading-relaxed mb-4"
          style={{ color: 'var(--text-2)' }}
        >
          {step.body}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: i === idx ? 'var(--brand)' : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={finish}
              className="text-xs font-light"
              style={{ color: 'var(--text-3)' }}
            >
              Skip
            </button>
            <button
              onClick={next}
              className="text-xs font-light px-4 py-1.5 rounded-full"
              style={{
                background: 'rgba(200,242,107,0.15)',
                border: '1px solid rgba(200,242,107,0.3)',
                color: '#C8F26B',
              }}
            >
              {idx === STEPS.length - 1 ? 'Got it' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
