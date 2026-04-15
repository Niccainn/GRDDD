import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type UseCaseData = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  heroSubtitle: string;
  sections: { heading: string; body: string }[];
  metrics: { value: string; label: string }[];
  cta: string;
};

const USE_CASES: Record<string, UseCaseData> = {
  'workflow-automation': {
    title: 'Workflow Automation for Small Teams',
    metaTitle: 'Workflow Automation for Small Teams — GRID',
    metaDescription: 'Automate your team\'s workflows with AI that learns and improves. GRID handles content, marketing, and ops workflows — reducing manual work by 87%.',
    keywords: ['workflow automation small teams', 'AI workflow automation', 'business process automation', 'team workflow software', 'automated workflows'],
    heroSubtitle: 'Stop building automations that break. Start building workflows that learn.',
    sections: [
      { heading: 'The problem with traditional automation', body: 'Most automation tools give you rigid if/then rules. When your process changes — and it always does — the automation breaks. You spend more time maintaining automations than the time they save.' },
      { heading: 'How GRID approaches automation differently', body: 'GRID workflows are adaptive. They track outcomes, measure efficiency, and surface suggestions for improvement. When a step consistently causes friction, the system flags it. When a pattern emerges across workflows, AI suggests consolidation.' },
      { heading: 'What this looks like in practice', body: 'A content team sets up a blog workflow: research → outline → draft → review → publish. GRID runs it, tracks time at each stage, scores quality outcomes, and after a few cycles, suggests skipping the outline step because drafts that skip it actually score higher. The workflow evolves.' },
      { heading: 'Built for teams without a dedicated ops person', body: 'You don\'t need a workflows engineer or automation specialist. GRID is designed for operators, founders, and small teams who need enterprise-level automation without enterprise-level complexity.' },
    ],
    metrics: [
      { value: '87%', label: 'reduction in manual work' },
      { value: '4 min', label: 'average workflow runtime' },
      { value: '3x', label: 'output per team member' },
    ],
    cta: 'Start automating workflows',
  },
  'ai-business-operations': {
    title: 'AI-Powered Business Operations',
    metaTitle: 'AI-Powered Business Operations Software — GRID',
    metaDescription: 'GRID uses AI to learn your business operations, surface bottlenecks, and suggest improvements. Get operational clarity without building dashboards.',
    keywords: ['AI business operations', 'business operations software', 'operational intelligence', 'AI operations management', 'business process optimization'],
    heroSubtitle: 'Your business has patterns. AI should find them for you.',
    sections: [
      { heading: 'Operations are invisible by default', body: 'Most companies can\'t answer basic questions: Which process takes the longest? Where do things get stuck? What changed last month? The data exists — it\'s just scattered across tools, spreadsheets, and people\'s heads.' },
      { heading: 'GRID makes operations visible', body: 'Every workflow in GRID generates operational data automatically. Time per stage, completion rates, quality scores, bottleneck frequency. You don\'t build dashboards — the system builds understanding.' },
      { heading: 'AI that learns your business', body: 'GRID\'s AI doesn\'t just respond to prompts. It observes patterns across your operations over time. It notices that onboarding takes 40% longer when a specific step is skipped. It flags when a workflow that used to take 10 minutes now takes 30. It suggests changes based on what\'s actually working.' },
      { heading: 'Operational clarity in weeks, not quarters', body: 'Traditional business intelligence requires data engineers, dashboard tools, and months of setup. GRID gives you operational clarity in the first two weeks — just by running your normal workflows through the system.' },
    ],
    metrics: [
      { value: 'Week 2', label: 'first operational insights' },
      { value: '40%', label: 'faster bottleneck detection' },
      { value: '0', label: 'dashboards to build' },
    ],
    cta: 'Get operational clarity',
  },
  'team-collaboration': {
    title: 'Team Collaboration Platform',
    metaTitle: 'Team Collaboration Platform — Beyond Chat and Docs | GRID',
    metaDescription: 'GRID is the team collaboration platform where workflows, goals, and operational health live in one connected system. No more silos between tools.',
    keywords: ['team collaboration platform', 'team collaboration software', 'team workspace', 'collaborative workspace', 'team productivity platform'],
    heroSubtitle: 'Collaboration isn\'t about messaging. It\'s about shared context.',
    sections: [
      { heading: 'The collaboration tool trap', body: 'Your team uses Slack for chat, Notion for docs, Asana for tasks, and a spreadsheet for tracking. Everyone has context — but nobody has the same context. Collaboration tools multiplied, but actual collaboration didn\'t improve.' },
      { heading: 'One system, shared understanding', body: 'GRID puts workflows, goals, tasks, and operational health in one workspace. Every team member sees the same system — not their own silo of it. When someone updates a workflow, everyone sees the impact.' },
      { heading: 'Collaborate on outcomes, not just tasks', body: 'Most collaboration tools help you assign tasks and track completion. GRID helps you collaborate on how the business runs — sharing workflows, comparing approaches, and learning from each other\'s operational patterns.' },
      { heading: 'Scale without losing coherence', body: 'As teams grow, context fragments. GRID maintains coherence by keeping everything connected — the workflow that produces the content that drives the marketing that generates the leads. One system, end to end.' },
    ],
    metrics: [
      { value: '1', label: 'source of truth' },
      { value: '100%', label: 'team visibility' },
      { value: '0', label: 'context switching' },
    ],
    cta: 'Unify your team',
  },
  'content-operations': {
    title: 'Content Operations at Scale',
    metaTitle: 'Content Operations at Scale — AI Content Workflow | GRID',
    metaDescription: 'Run your entire content pipeline in GRID. From research to publish in minutes, with quality scores, time tracking, and workflows that improve every cycle.',
    keywords: ['content operations', 'content workflow automation', 'AI content creation', 'content pipeline software', 'content management workflow'],
    heroSubtitle: 'From idea to published in minutes. With quality that compounds.',
    sections: [
      { heading: 'Content is an operations problem', body: 'Most teams treat content as a creative challenge. It\'s actually an operational one. The bottleneck isn\'t ideas — it\'s the process of turning ideas into published, distributed, measured content consistently.' },
      { heading: 'A workflow, not a blank page', body: 'GRID turns content creation into a structured workflow: research → brief → draft → review → optimize → publish. Each stage has clear inputs and outputs. AI assists at every step. The team focuses on quality, not process.' },
      { heading: 'Quality that improves automatically', body: 'Every piece of content that flows through GRID gets a quality score. Over time, the system learns what makes your best content perform — and surfaces those patterns for every new piece.' },
      { heading: 'Real metrics, not vanity metrics', body: 'Track time per piece, output velocity, quality scores, and team efficiency. See which workflow stages take longest. Identify and eliminate bottlenecks. Ship more, better, faster.' },
    ],
    metrics: [
      { value: '4 min', label: 'research to draft' },
      { value: '14', label: 'posts ready to schedule' },
      { value: '92%', label: 'average quality score' },
    ],
    cta: 'Scale your content ops',
  },
  'client-onboarding': {
    title: 'Client Onboarding That Self-Improves',
    metaTitle: 'Client Onboarding Automation — Self-Improving Workflows | GRID',
    metaDescription: 'Build client onboarding workflows that track engagement at every stage and improve automatically. Every new client gets a smoother experience than the last.',
    keywords: ['client onboarding automation', 'client onboarding software', 'onboarding workflow', 'customer onboarding process', 'automated onboarding'],
    heroSubtitle: 'Every onboarding should be smoother than the last. GRID makes that automatic.',
    sections: [
      { heading: 'Onboarding is your first impression', body: 'A clunky onboarding experience costs you clients before they even start. But most teams run onboarding from a checklist that hasn\'t been updated since it was written — months or years ago.' },
      { heading: 'Structured, measured, adaptive', body: 'GRID onboarding workflows have stages: discovery, setup, training, handoff. Health scores track engagement at every step. You see exactly where clients drop off, get confused, or need extra support.' },
      { heading: 'Self-improving workflows', body: 'After each onboarding, GRID surfaces what worked and what didn\'t. Which steps caused friction? Where did clients need the most support? The operator adjusts the workflow once, and every future client benefits.' },
      { heading: 'Scale without adding headcount', body: 'As your client base grows, onboarding becomes a bottleneck. GRID automates the repeatable parts, flags the parts that need human touch, and ensures consistency — without hiring dedicated onboarding staff.' },
    ],
    metrics: [
      { value: '60%', label: 'faster onboarding' },
      { value: '95%', label: 'client satisfaction' },
      { value: '0', label: 'additional headcount needed' },
    ],
    cta: 'Automate your onboarding',
  },
  founders: {
    title: 'The Founder\'s Operating System',
    metaTitle: 'Founder Operating System — Run Your Business from One View | GRID',
    metaDescription: 'GRID gives founders full operational visibility — systems, workflows, goals, and health scores — without hiring a COO or building custom dashboards.',
    keywords: ['founder tools', 'startup operations software', 'founder operating system', 'business management for founders', 'startup workflow automation'],
    heroSubtitle: 'See your entire business. No COO required.',
    sections: [
      { heading: 'The founder\'s visibility problem', body: 'You built the company, but you can\'t see how it runs. Information lives in people\'s heads, spreadsheets, and tools you don\'t check. You find out about problems after they\'ve already caused damage.' },
      { heading: 'One view of everything', body: 'GRID gives you a living map of your business. Systems, workflows, goals, team capacity, and operational health — all connected, all real-time. You don\'t need to ask for updates. The system shows you.' },
      { heading: 'Make decisions with data, not gut feel', body: 'Which process is the biggest bottleneck? Which team is most efficient? Where should you invest your next hire? GRID surfaces these answers from your operational data — data that was always there but never visible.' },
      { heading: 'Scale yourself before you scale the team', body: 'Before you hire a COO or ops lead, maximize what you and your current team can do. GRID helps founders run like a team of 20 while they\'re still a team of 5.' },
    ],
    metrics: [
      { value: '100%', label: 'operational visibility' },
      { value: '5x', label: 'output per person' },
      { value: '$0', label: 'additional tooling cost' },
    ],
    cta: 'Get started as a founder',
  },
};

export function generateStaticParams() {
  return Object.keys(USE_CASES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = USE_CASES[slug];
  if (!data) return {};
  return {
    title: data.metaTitle,
    description: data.metaDescription,
    keywords: data.keywords,
    openGraph: { title: data.metaTitle, description: data.metaDescription },
  };
}

export default async function UseCaseSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = USE_CASES[slug];
  if (!data) notFound();

  return (
    <div className="min-h-screen ambient-bg">
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-24 md:py-32">
        <Link href="/use-cases" className="inline-flex items-center gap-2 text-xs font-light mb-12 transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>
          <span>&larr;</span> All use cases
        </Link>

        <h1 className="text-3xl md:text-5xl font-extralight tracking-tight leading-[1.1] mb-6">
          {data.title}
        </h1>
        <p className="text-lg font-light leading-relaxed max-w-2xl mb-12" style={{ color: 'var(--text-2)' }}>
          {data.heroSubtitle}
        </p>

        {/* Metrics bar */}
        <div className="glass-panel p-6 mb-16 grid grid-cols-3 gap-4">
          {data.metrics.map((m, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl md:text-3xl font-extralight mb-1" style={{ color: 'var(--brand)' }}>{m.value}</p>
              <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>{m.label}</p>
            </div>
          ))}
        </div>

        {/* Content sections */}
        <div className="space-y-12 mb-20">
          {data.sections.map((s, i) => (
            <div key={i}>
              <h2 className="text-xl font-light mb-4">{s.heading}</h2>
              <p className="text-sm font-light leading-[1.8]" style={{ color: 'var(--text-2)' }}>{s.body}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="glass-panel p-10 text-center" style={{ borderColor: 'var(--brand-border)' }}>
          <h2 className="text-2xl font-extralight mb-4">Ready to try it?</h2>
          <p className="text-sm font-light mb-8" style={{ color: 'var(--text-2)' }}>
            Join the early access program and see GRID in action.
          </p>
          <Link
            href="/sign-up"
            className="inline-block px-8 py-3.5 text-sm font-light rounded-full transition-all"
            style={{ background: 'var(--brand)', color: '#000', fontWeight: 400 }}
          >
            {data.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
