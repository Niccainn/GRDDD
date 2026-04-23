/**
 * /roadmap — nine items over three months, public, honest.
 *
 * Replaces the sprawling internal backlog. The reviewer's feedback
 * was explicit: "if the team tries to ship all 54 items on their
 * backlog we'd be worried about focus." This is the focus
 * commitment, made public so users and partners can hold us to it.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

export const metadata: Metadata = {
  title: 'Roadmap — GRID',
  description:
    'Nine items over three months. What we are shipping, in order. Public so users and partners can hold us to it.',
};

type Item = {
  id: string;
  month: 1 | 2 | 3;
  theme: 'Activation' | 'Trust' | 'Distribution';
  title: string;
  why: string;
  status: 'in-flight' | 'next' | 'queued';
};

const ITEMS: Item[] = [
  // Month 1 — Activation
  {
    id: 'm1-1',
    month: 1,
    theme: 'Activation',
    title: 'Real SSO (Google + Microsoft)',
    why: 'Every enterprise conversation currently stalls on "Can my team sign in with Google?" Unblock it.',
    status: 'in-flight',
  },
  {
    id: 'm1-2',
    month: 1,
    theme: 'Activation',
    title: 'Projects empty-state showcase',
    why:
      'Land new users on five featured prompts they can run in one click. First interaction layer demo happens on day one.',
    status: 'in-flight',
  },
  {
    id: 'm1-3',
    month: 1,
    theme: 'Activation',
    title: 'Reverse-the-blank-page moments',
    why:
      'Empty states on Tasks, Goals, Docs, Finance, and Time — replace "No X yet" with one sentence + a one-click starter.',
    status: 'next',
  },

  // Month 2 — Trust
  {
    id: 'm2-1',
    month: 2,
    theme: 'Trust',
    title: 'Per-route role enforcement',
    why:
      'lib/auth/roles.ts is wired; fan out the check to every mutation route so CONTRIBUTOR and VIEWER read correctly across the product.',
    status: 'queued',
  },
  {
    id: 'm2-2',
    month: 2,
    theme: 'Trust',
    title: 'Signed monthly ROI report',
    why:
      'Print-CSS page exists; sign with full AuditLog hash and automate the delivery to a configured email on the 1st of each month.',
    status: 'queued',
  },
  {
    id: 'm2-3',
    month: 2,
    theme: 'Trust',
    title: 'Real-tool OAuth UX',
    why:
      'One-click connect for the 15 wired executors directly from the WhyDrawer when the action falls back to simulated.',
    status: 'queued',
  },

  // Month 3 — Distribution
  {
    id: 'm3-1',
    month: 3,
    theme: 'Distribution',
    title: 'Public Environment share',
    why:
      'Tokenized read-only share URLs already exist. Make them beautiful, SEO-friendly, screenshottable — every shared page becomes marketing.',
    status: 'queued',
  },
  {
    id: 'm3-2',
    month: 3,
    theme: 'Distribution',
    title: 'Weekly narrative auto-post',
    why:
      'Run GRID on GRID. Monday narrative generates, posts to /blog/week-[N] automatically. Public build-log that compounds.',
    status: 'queued',
  },
  {
    id: 'm3-3',
    month: 3,
    theme: 'Distribution',
    title: 'Template gallery',
    why:
      'Every Project template becomes a public landing page. Each one is a try-in-your-workspace one-click conversion. SEO + organic entry.',
    status: 'queued',
  },
];

const THEME_COLOR: Record<Item['theme'], string> = {
  Activation: '#C8F26B',
  Trust: '#7193ED',
  Distribution: '#BF9FF1',
};

const STATUS_META: Record<Item['status'], { label: string; color: string }> = {
  'in-flight': { label: 'In flight', color: '#C8F26B' },
  next: { label: 'Next', color: '#F5D76E' },
  queued: { label: 'Queued', color: '#8B9AA8' },
};

export default function RoadmapPage() {
  const byMonth: Record<number, Item[]> = { 1: [], 2: [], 3: [] };
  for (const item of ITEMS) byMonth[item.month].push(item);

  return (
    <div className="min-h-screen px-5 md:px-8 py-20 md:py-28">
      <div className="max-w-3xl mx-auto">
        <p
          className="text-[10px] tracking-[0.16em] uppercase mb-3 font-light"
          style={{ color: 'var(--text-3)' }}
        >
          Roadmap · Next 90 days
        </p>
        <h1 className="text-3xl md:text-4xl font-extralight tracking-tight mb-4">
          Nine items. In order.
        </h1>
        <p className="text-sm font-light leading-relaxed mb-10" style={{ color: 'var(--text-2)' }}>
          Three months, three themes, nine commitments. We are not shipping everything
          on the internal backlog — we are shipping these. Public so users and partners
          can hold us to it.
        </p>

        {[1, 2, 3].map(m => {
          const items = byMonth[m];
          const theme = items[0]?.theme ?? 'Activation';
          const color = THEME_COLOR[theme];
          return (
            <section key={m} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                <p
                  className="text-[10px] tracking-[0.18em] uppercase font-light"
                  style={{ color: 'var(--text-3)' }}
                >
                  Month {m} · {theme}
                </p>
              </div>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
              >
                {items.map((item, i) => {
                  const meta = STATUS_META[item.status];
                  return (
                    <div
                      key={item.id}
                      className="px-5 py-5"
                      style={{
                        borderBottom:
                          i < items.length - 1 ? '1px solid var(--glass-border)' : 'none',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
                          {item.title}
                        </p>
                        <span
                          className="text-[10px] font-light tracking-wider uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            color: meta.color,
                            background: `${meta.color}14`,
                            border: `1px solid ${meta.color}30`,
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p
                        className="text-xs font-light leading-relaxed"
                        style={{ color: 'var(--text-2)' }}
                      >
                        {item.why}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <div
          className="rounded-2xl p-6 mt-10"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
            What we are deliberately <em>not</em> shipping in this window: a second
            pricing rework, net-new integrations beyond the 15 already real, a mobile
            native app, anything in the generative-design category. If any of those
            matter to you, tell us in the waitlist form — the next roadmap will be
            informed by what we heard.
          </p>
        </div>

        <p className="text-[11px] font-light mt-8" style={{ color: 'var(--text-3)' }}>
          See what is already live at{' '}
          <Link href="/capabilities" style={{ color: 'var(--brand)' }}>
            /capabilities
          </Link>
          . Architecture brief at{' '}
          <Link href="/security/architecture" style={{ color: 'var(--brand)' }}>
            /security/architecture
          </Link>
          .
        </p>
      </div>
      <LegalFooter />
    </div>
  );
}
