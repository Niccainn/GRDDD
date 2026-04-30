import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'GRID vs The Competition — Compare Work Management Platforms',
  description: 'Compare GRID to Notion, Monday.com, ClickUp, and Asana. See why teams switch to the adaptive workspace that learns and evolves with your business.',
  keywords: ['notion alternative', 'monday.com alternative', 'clickup alternative', 'asana alternative', 'project management comparison', 'best work management software'],
};

const competitors = [
  {
    slug: 'notion',
    name: 'Notion',
    tagline: 'From docs to adaptive operations',
    description: 'Notion organizes information. GRID operationalizes it — turning docs and wikis into living workflows that learn from every execution.',
  },
  {
    slug: 'monday',
    name: 'Monday.com',
    tagline: 'Beyond boards and dashboards',
    description: 'Monday.com tracks work on boards. GRID connects the work to outcomes — showing you what\'s actually moving the business forward, not just what\'s checked off.',
  },
  {
    slug: 'clickup',
    name: 'ClickUp',
    tagline: 'One app that actually adapts',
    description: 'ClickUp replaces tools. GRID replaces the way you think about tools — building an intelligent layer that learns your operations and improves them over time.',
  },
  {
    slug: 'asana',
    name: 'Asana',
    tagline: 'From task tracking to business intelligence',
    description: 'Asana manages tasks. GRID manages the system behind the tasks — surfacing patterns, bottlenecks, and opportunities that task lists never show.',
  },
];

export default function ComparePage() {
  return (
    <div className="min-h-screen ambient-bg">
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-24 md:py-32">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-light mb-12 transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>
          <span>&larr;</span> Back to GRID
        </Link>

        <p className="text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: 'var(--brand)', opacity: 0.6 }}>
          Compare
        </p>
        <h1 className="text-3xl md:text-5xl font-extralight tracking-tight leading-[1.1] mb-6">
          Why teams switch to{' '}
          <span style={{ color: 'var(--brand)' }}>GRID</span>
        </h1>
        <p className="text-base font-light leading-relaxed max-w-2xl mb-16" style={{ color: 'var(--text-2)' }}>
          Most tools manage tasks. GRID manages the system — an adaptive workspace where teams and AI
          learn the business together, so operations improve every week.
        </p>

        <div className="grid gap-6">
          {competitors.map((c) => (
            <Link
              key={c.slug}
              href={`/compare/${c.slug}`}
              className="glass-panel p-8 group transition-all hover:scale-[1.01]"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2 className="text-xl font-light">GRID vs {c.name}</h2>
                <span className="text-xs font-light px-3 py-1 rounded-full transition-colors"
                  style={{ border: '1px solid var(--glass-border)', color: 'var(--text-3)' }}>
                  Compare &rarr;
                </span>
              </div>
              <p className="text-sm font-light mb-3" style={{ color: 'var(--brand)' }}>{c.tagline}</p>
              <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>{c.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-20 text-center">
          <h2 className="text-2xl font-extralight mb-4">Ready to see the difference?</h2>
          <p className="text-sm font-light mb-8" style={{ color: 'var(--text-2)' }}>
            Join the teams already running on GRID.
          </p>
          <Link
            href="/#waitlist"
            className="inline-block px-8 py-3.5 text-sm font-light rounded-full transition-all"
            style={{ background: 'var(--brand)', color: '#000', fontWeight: 400 }}
          >
            Get started free
          </Link>
        </div>
      </div>
    </div>
  );
}
