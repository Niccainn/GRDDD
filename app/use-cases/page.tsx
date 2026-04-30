import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Use Cases — How Teams Use GRID',
  description: 'See how founders, operators, and small teams use GRID to automate workflows, gain operational clarity, and scale their business without adding headcount.',
  keywords: ['workflow automation use cases', 'AI business automation examples', 'team productivity software', 'small team operations', 'business workflow examples'],
};

const useCases = [
  {
    slug: 'workflow-automation',
    category: 'Automation',
    title: 'Workflow Automation for Small Teams',
    description: 'Automate content, marketing, and operations workflows that used to take hours. GRID runs them in minutes — and improves them over time.',
    metric: '87% less manual work',
  },
  {
    slug: 'ai-business-operations',
    category: 'Operations',
    title: 'AI-Powered Business Operations',
    description: 'Let AI learn your business patterns and surface operational insights. See what\'s efficient, what\'s bottlenecked, and what needs attention — without building dashboards.',
    metric: 'Operational clarity in 2 weeks',
  },
  {
    slug: 'team-collaboration',
    category: 'Collaboration',
    title: 'Team Collaboration Platform',
    description: 'A workspace where every team member sees the same system — connected workflows, shared goals, and real-time operational health. No more silos.',
    metric: 'One source of truth',
  },
  {
    slug: 'content-operations',
    category: 'Content',
    title: 'Content Operations at Scale',
    description: 'From research to draft to review to publish — run your entire content pipeline in GRID. Track quality scores, time per piece, and output velocity.',
    metric: 'Blog post in 4 minutes',
  },
  {
    slug: 'client-onboarding',
    category: 'Client Success',
    title: 'Client Onboarding That Self-Improves',
    description: 'Structured client onboarding workflows that track engagement at every stage. Every onboarding gets smoother than the last — automatically.',
    metric: '60% faster onboarding',
  },
  {
    slug: 'founders',
    category: 'Founders',
    title: 'The Founder\'s Operating System',
    description: 'See your entire business in one view. Systems, workflows, goals, and health scores — the operational clarity you need without hiring a COO.',
    metric: 'Full visibility, zero overhead',
  },
];

export default function UseCasesPage() {
  return (
    <div className="min-h-screen ambient-bg">
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-24 md:py-32">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-light mb-12 transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>
          <span>&larr;</span> Back to GRID
        </Link>

        <p className="text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: 'var(--brand)', opacity: 0.6 }}>
          Use Cases
        </p>
        <h1 className="text-3xl md:text-5xl font-extralight tracking-tight leading-[1.1] mb-6">
          Built for how you{' '}
          <span style={{ color: 'var(--brand)' }}>actually work</span>
        </h1>
        <p className="text-base font-light leading-relaxed max-w-2xl mb-16" style={{ color: 'var(--text-2)' }}>
          GRID adapts to your workflows, your team size, and your industry. Here&apos;s how teams
          are using it to transform their operations.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {useCases.map((uc) => (
            <Link
              key={uc.slug}
              href={`/use-cases/${uc.slug}`}
              className="glass-panel p-8 group transition-all hover:scale-[1.01] flex flex-col"
            >
              <p className="text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: 'var(--brand)', opacity: 0.6 }}>
                {uc.category}
              </p>
              <h2 className="text-lg font-light mb-3">{uc.title}</h2>
              <p className="text-sm font-light leading-relaxed flex-1 mb-4" style={{ color: 'var(--text-2)' }}>{uc.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-light px-3 py-1 rounded-full" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                  {uc.metric}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>Learn more &rarr;</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-20 text-center">
          <h2 className="text-2xl font-extralight mb-4">Don&apos;t see your use case?</h2>
          <p className="text-sm font-light mb-8" style={{ color: 'var(--text-2)' }}>
            GRID adapts to any workflow. Tell us what you&apos;re building.
          </p>
          <Link
            href="/#waitlist"
            className="inline-block px-8 py-3.5 text-sm font-light rounded-full transition-all"
            style={{ background: 'var(--brand)', color: '#000', fontWeight: 400 }}
          >
            Request early access
          </Link>
        </div>
      </div>
    </div>
  );
}
