/**
 * /help — in-app documentation hub.
 *
 * Renders the curated resources from /docs as browsable pages. We
 * don't fully dynamic-render each doc file (fs read at runtime) —
 * instead this index page lives as a single static server component
 * that points at the linked resources on the project repo OR (for
 * user-facing docs) the sub-pages we explicitly embed.
 *
 * The /help index itself is the table of contents. Each sub-route
 * under /help/[slug] renders a single markdown file from docs/
 * using the same minimal renderer the /changelog page uses.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

export const metadata: Metadata = {
  title: 'Help',
  description: 'Getting started, FAQ, troubleshooting, and user guide for GRID.',
};

type Resource = {
  href: string;
  title: string;
  description: string;
  audience: 'user' | 'operator';
  readTime: string;
};

const RESOURCES: Resource[] = [
  {
    href: '/help/quickstart',
    title: 'Quickstart',
    description: 'Sign-up to first working workflow in 5 minutes.',
    audience: 'user',
    readTime: '5 min read',
  },
  {
    href: '/help/user-guide',
    title: 'User Guide',
    description: 'Every feature explained, every click counted. The full reference.',
    audience: 'user',
    readTime: '25 min read',
  },
  {
    href: '/help/faq',
    title: 'FAQ',
    description: 'Common questions grouped by topic — getting started, privacy, Nova, billing.',
    audience: 'user',
    readTime: '10 min read',
  },
  {
    href: '/help/troubleshooting',
    title: 'Troubleshooting',
    description: 'Specific fixes for specific symptoms. Use this when something breaks.',
    audience: 'user',
    readTime: '8 min read',
  },
  {
    href: '/help/admin',
    title: 'Admin Guide',
    description: 'For the operator: env vars, monitoring, day-0 setup, release process.',
    audience: 'operator',
    readTime: '15 min read',
  },
  {
    href: '/help/incident-response',
    title: 'Incident Response',
    description: 'GDPR-compliant breach runbook: declare, contain, assess, notify, fix.',
    audience: 'operator',
    readTime: '10 min read',
  },
];

export default function HelpIndexPage() {
  const forUsers = RESOURCES.filter(r => r.audience === 'user');
  const forOperators = RESOURCES.filter(r => r.audience === 'operator');

  return (
    <div className="min-h-screen px-5 md:px-8 py-20 md:py-28">
      <div className="max-w-3xl mx-auto">
        <p className="text-[10px] tracking-[0.16em] uppercase mb-3 font-light" style={{ color: 'var(--text-3)' }}>
          Help Center
        </p>
        <h1 className="text-3xl md:text-4xl font-extralight tracking-tight mb-4">Resources</h1>
        <p className="text-sm font-light leading-relaxed mb-10" style={{ color: 'var(--text-2)' }}>
          Everything you need to know about GRID. New? Start with the Quickstart. Stuck?
          Troubleshooting. Running the deployment? Admin Guide. For anything else, use the
          Nova bar at the bottom-right — it has your workspace context.
        </p>

        <ResourceList title="For users" items={forUsers} />
        <ResourceList title="For operators" items={forOperators} />

        <div
          className="mt-12 p-5 rounded-2xl"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <h2 className="text-xs tracking-[0.16em] uppercase font-light mb-2" style={{ color: 'var(--text-3)' }}>
            Can't find what you're looking for?
          </h2>
          <div className="space-y-2 text-sm font-light" style={{ color: 'var(--text-2)' }}>
            <p>
              <strong style={{ color: 'var(--text-1)', fontWeight: 500 }}>Ask Nova.</strong>
              {' '}Click the Nova bar at the bottom-right of any page. It has the context of
              your workspace and can answer most product questions directly.
            </p>
            <p>
              <strong style={{ color: 'var(--text-1)', fontWeight: 500 }}>Email us.</strong>
              {' '}<a href="mailto:support@grid.systems" style={{ color: 'var(--brand)' }}>support@grid.systems</a>
              {' '}— typically respond within 24h Mon-Fri.
            </p>
            <p>
              <strong style={{ color: 'var(--text-1)', fontWeight: 500 }}>Security issue?</strong>
              {' '}<a href="mailto:security@grid.systems" style={{ color: 'var(--brand)' }}>security@grid.systems</a>
              {' '}— see <Link href="/security" style={{ color: 'var(--brand)' }}>/security</Link>{' '}
              for the full disclosure policy.
            </p>
          </div>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}

function ResourceList({ title, items }: { title: string; items: Resource[] }) {
  return (
    <section className="mb-10">
      <h2
        className="text-xs tracking-[0.16em] uppercase font-light mb-3"
        style={{ color: 'var(--text-3)' }}
      >
        {title}
      </h2>
      <div className="space-y-2">
        {items.map(r => (
          <Link
            key={r.href}
            href={r.href}
            className="block p-4 rounded-xl transition-all"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
          >
            <div className="flex items-start justify-between gap-4 mb-1">
              <h3 className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
                {r.title}
              </h3>
              <span className="text-[10px] font-light whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                {r.readTime}
              </span>
            </div>
            <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-3)' }}>
              {r.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
