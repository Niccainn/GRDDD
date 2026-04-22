'use client';

/**
 * ProjectLauncher — "What do you want Nova to do?" dialog.
 *
 * Lives as a compact CTA row that expands into a full prompt box.
 * Accepts a free-text goal, posts to /api/projects, and routes the
 * user to the Zapier-style project page on success.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Template = {
  id: string;
  title: string;
  subtitle: string;
  goal: string;
  badge: string;
};

const BADGE_COLOR: Record<string, string> = {
  brand: '#C8F26B',
  marketing: '#BF9FF1',
  operations: '#7193ED',
  design: '#E879F9',
  finance: '#F5D76E',
  development: '#6395FF',
};

export default function ProjectLauncher({ environmentId }: { environmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/projects/templates')
      .then(r => r.json())
      .then(d => setTemplates(Array.isArray(d.templates) ? d.templates : []))
      .catch(() => {});
  }, [open]);

  async function launch(goalText: string) {
    if (!goalText.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goalText.trim(), environmentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not start the project');
        return;
      }
      router.push(`/projects/${data.project.id}`);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl p-5 text-left transition-colors"
        style={{
          background: 'var(--glass)',
          border: '1px dashed var(--glass-border)',
          color: 'var(--text-2)',
        }}
      >
        <span className="flex items-center gap-3">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(191,159,241,0.1)',
              color: '#BF9FF1',
              border: '1px solid rgba(191,159,241,0.25)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M6 2v8M2 6h8" strokeLinecap="round" />
            </svg>
          </span>
          <span className="flex-1">
            <span className="block text-sm font-light" style={{ color: 'var(--text-1)' }}>
              Start a new project
            </span>
            <span className="block text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
              Tell Nova what you want done. It plans the steps, opens the tools, routes the reviews.
            </span>
          </span>
        </span>
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
    >
      <p
        className="text-[10px] tracking-[0.18em] uppercase font-light mb-3"
        style={{ color: 'var(--text-3)' }}
      >
        New project · Nova will plan and run the steps
      </p>
      <textarea
        autoFocus
        value={goal}
        onChange={e => setGoal(e.target.value)}
        placeholder="e.g. Design a full brand identity in Figma and set up an asset library in Notion."
        rows={3}
        className="w-full text-sm font-light px-4 py-3 rounded-xl focus:outline-none mb-3"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-1)',
          resize: 'vertical',
        }}
      />
      {templates.length > 0 && (
        <>
          <p
            className="text-[10px] tracking-[0.16em] uppercase font-light mb-2"
            style={{ color: 'var(--text-3)' }}
          >
            Or pick a template
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {templates.map(t => {
              const color = BADGE_COLOR[t.badge] ?? '#BF9FF1';
              return (
                <button
                  key={t.id}
                  onClick={() => launch(t.goal)}
                  disabled={submitting}
                  className="text-left rounded-xl p-3 transition-colors disabled:opacity-50"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: color }}
                    />
                    <span className="text-[10px] font-light tracking-wider uppercase" style={{ color: 'var(--text-3)' }}>
                      {t.badge}
                    </span>
                  </div>
                  <p className="text-xs font-light mb-0.5" style={{ color: 'var(--text-1)' }}>
                    {t.title}
                  </p>
                  <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                    {t.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </>
      )}
      {error && (
        <p className="text-[11px] font-light mb-2" style={{ color: '#FF8C8C' }}>
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setOpen(false); setGoal(''); setError(''); }}
          className="text-xs font-light"
          style={{ color: 'var(--text-3)' }}
        >
          Cancel
        </button>
        <button
          onClick={() => launch(goal)}
          disabled={!goal.trim() || submitting}
          className="text-sm font-light px-5 py-2 rounded-xl disabled:opacity-40"
          style={{
            background: 'var(--brand-soft)',
            border: '1px solid var(--brand-border)',
            color: 'var(--brand)',
          }}
        >
          {submitting ? 'Nova is planning…' : 'Plan + start →'}
        </button>
      </div>
    </div>
  );
}
