import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type CompareData = {
  name: string;
  title: string;
  metaDescription: string;
  keywords: string[];
  heroSubtitle: string;
  painPoints: { theirs: string; grid: string }[];
  differentiators: { title: string; description: string }[];
  verdict: string;
};

const COMPARISONS: Record<string, CompareData> = {
  notion: {
    name: 'Notion',
    title: 'GRID vs Notion — From Docs to Adaptive Operations',
    metaDescription: 'Compare GRID and Notion. Notion organizes information in docs and wikis. GRID turns your operations into an adaptive system that learns and improves every week.',
    keywords: ['notion alternative', 'notion vs grid', 'notion replacement', 'better than notion for operations', 'notion for business operations'],
    heroSubtitle: 'Notion is a powerful knowledge base. GRID is an adaptive operating system. Here\'s why that distinction matters.',
    painPoints: [
      { theirs: 'Docs and wikis that describe how work should happen', grid: 'Living workflows that show how work actually happens — and improve it' },
      { theirs: 'AI that helps you write and summarize', grid: 'AI that learns your business patterns and suggests operational improvements' },
      { theirs: 'Databases that organize information', grid: 'Systems that connect information to outcomes and track real efficiency gains' },
      { theirs: 'Templates you customize once', grid: 'Workflows that evolve automatically based on what\'s working' },
    ],
    differentiators: [
      { title: 'Operational intelligence, not just documentation', description: 'Notion captures knowledge. GRID captures the operational patterns behind that knowledge — surfacing bottlenecks, measuring efficiency, and suggesting improvements your team hasn\'t spotted yet.' },
      { title: 'AI that learns with you', description: 'Notion\'s AI writes docs faster. GRID\'s AI learns how your business works, tracks which workflows produce the best outcomes, and helps you replicate success across teams.' },
      { title: 'Measurable outcomes', description: 'Every workflow in GRID tracks time saved, quality scores, and efficiency gains. You don\'t just organize work — you prove the value of how you work.' },
    ],
    verdict: 'If you need a knowledge base, Notion is excellent. If you need your operations to get smarter every week, GRID is built for that.',
  },
  monday: {
    name: 'Monday.com',
    title: 'GRID vs Monday.com — Beyond Boards and Dashboards',
    metaDescription: 'Compare GRID and Monday.com. Monday tracks work on boards. GRID connects work to outcomes — showing what\'s actually moving the business, not just what\'s checked off.',
    keywords: ['monday.com alternative', 'monday vs grid', 'monday replacement', 'better than monday for teams', 'monday.com competitor'],
    heroSubtitle: 'Monday.com is a work tracking platform. GRID is an adaptive workspace that learns. Here\'s the difference.',
    painPoints: [
      { theirs: 'Colorful boards that visualize task status', grid: 'Intelligent systems that connect tasks to business outcomes' },
      { theirs: 'Dashboards that summarize what happened', grid: 'AI that predicts what will happen and suggests what to do about it' },
      { theirs: 'Automations that follow rigid if/then rules', grid: 'Workflows that adapt based on what\'s actually working' },
      { theirs: 'Per-seat pricing that scales with headcount', grid: 'A workspace designed to scale output without scaling headcount' },
    ],
    differentiators: [
      { title: 'From tracking to intelligence', description: 'Monday tells you what\'s done and what\'s overdue. GRID tells you why things are overdue, which processes are bottlenecked, and how to fix them — before they become problems.' },
      { title: 'AI-native, not AI-added', description: 'Monday bolted AI onto an existing board system. GRID was built from day one as a co-learning platform where AI and humans improve operations together.' },
      { title: 'Efficiency you can measure', description: 'GRID doesn\'t just manage work — it measures the efficiency of how you work. See time saved per workflow, quality scores, and compound improvements over weeks.' },
    ],
    verdict: 'Monday.com is great for visual project tracking. If you want your workspace to actively make your team more efficient, GRID is the next step.',
  },
  clickup: {
    name: 'ClickUp',
    title: 'GRID vs ClickUp — One App That Actually Adapts',
    metaDescription: 'Compare GRID and ClickUp. ClickUp consolidates tools into one app. GRID goes further — building an intelligent system that learns your operations and improves them.',
    keywords: ['clickup alternative', 'clickup vs grid', 'clickup replacement', 'better than clickup', 'clickup competitor 2026'],
    heroSubtitle: 'ClickUp replaces your tools. GRID replaces the way you think about operations. Here\'s the difference.',
    painPoints: [
      { theirs: 'One app with every feature you could need', grid: 'One workspace where every feature learns from how you use it' },
      { theirs: 'Overwhelming feature density with steep learning curve', grid: 'Progressive complexity that reveals itself as your needs grow' },
      { theirs: 'Docs, tasks, goals, and whiteboards in one place', grid: 'Docs, workflows, AI agents, and business intelligence in one adaptive system' },
      { theirs: 'Automations you build manually', grid: 'Workflows that suggest their own improvements based on real outcomes' },
    ],
    differentiators: [
      { title: 'Adaptive, not just all-in-one', description: 'ClickUp gives you every tool. GRID gives you a system that learns which tools and workflows produce the best results — and helps you do more of what works.' },
      { title: 'Built for operators, not just project managers', description: 'ClickUp is optimized for project management. GRID is optimized for running a business — connecting operations, content, marketing, and finance into one intelligent view.' },
      { title: 'Compound improvement', description: 'In ClickUp, your workspace stays the same unless you change it. In GRID, the system surfaces insights, suggests process improvements, and gets more useful every week.' },
    ],
    verdict: 'ClickUp is a powerful all-in-one tool. If you want an all-in-one that gets smarter the more you use it, GRID is built for that future.',
  },
  asana: {
    name: 'Asana',
    title: 'GRID vs Asana — From Task Lists to Business Intelligence',
    metaDescription: 'Compare GRID and Asana. Asana manages projects and tasks. GRID manages the system behind your tasks — surfacing patterns and opportunities task lists never show.',
    keywords: ['asana alternative', 'asana vs grid', 'asana replacement', 'better than asana', 'asana competitor'],
    heroSubtitle: 'Asana manages your tasks. GRID manages the system behind them. That\'s a fundamental difference.',
    painPoints: [
      { theirs: 'Task lists and project timelines', grid: 'Business systems with connected workflows and outcome tracking' },
      { theirs: 'Workload views showing who\'s busy', grid: 'Operational intelligence showing what\'s efficient and what\'s not' },
      { theirs: 'Goals that track completion percentage', grid: 'Goals connected to real operational metrics and AI-driven insights' },
      { theirs: 'Portfolios that roll up project status', grid: 'Environments that give you a living picture of how your business actually runs' },
    ],
    differentiators: [
      { title: 'Operations, not just tasks', description: 'Asana is excellent at task management. GRID operates at a higher level — connecting tasks to workflows to systems to business outcomes. You don\'t just track work, you understand it.' },
      { title: 'AI that does real work', description: 'Asana\'s AI helps prioritize and summarize. GRID\'s AI runs workflows, learns from outcomes, and actively suggests operational improvements based on real data.' },
      { title: 'Built for growing companies', description: 'Asana works great at the project level. GRID scales to the business level — helping founders and operators see the full picture without needing a dedicated ops team.' },
    ],
    verdict: 'Asana is a reliable project management tool. If you\'re ready to move from managing projects to managing a business system, GRID is designed for that leap.',
  },
};

export function generateStaticParams() {
  return Object.keys(COMPARISONS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = COMPARISONS[slug];
  if (!data) return {};
  return {
    title: data.title,
    description: data.metaDescription,
    keywords: data.keywords,
    openGraph: {
      title: data.title,
      description: data.metaDescription,
    },
  };
}

export default async function CompareSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = COMPARISONS[slug];
  if (!data) notFound();

  return (
    <div className="min-h-screen ambient-bg">
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-24 md:py-32">
        <Link href="/compare" className="inline-flex items-center gap-2 text-xs font-light mb-12 transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>
          <span>&larr;</span> All comparisons
        </Link>

        <p className="text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: 'var(--brand)', opacity: 0.6 }}>
          Compare
        </p>
        <h1 className="text-3xl md:text-5xl font-extralight tracking-tight leading-[1.1] mb-6">
          GRID vs {data.name}
        </h1>
        <p className="text-base font-light leading-relaxed max-w-2xl mb-16" style={{ color: 'var(--text-2)' }}>
          {data.heroSubtitle}
        </p>

        {/* Pain point comparison */}
        <div className="mb-20">
          <h2 className="text-lg font-light mb-8" style={{ color: 'var(--text-2)' }}>Where they differ</h2>
          <div className="grid gap-4">
            {data.painPoints.map((p, i) => (
              <div key={i} className="glass-panel p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--text-3)' }}>{data.name}</p>
                  <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>{p.theirs}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--brand)' }}>GRID</p>
                  <p className="text-sm font-light leading-relaxed">{p.grid}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Differentiators */}
        <div className="mb-20">
          <h2 className="text-lg font-light mb-8" style={{ color: 'var(--text-2)' }}>What makes GRID different</h2>
          <div className="grid gap-6">
            {data.differentiators.map((d, i) => (
              <div key={i} className="glass-panel p-8">
                <h3 className="text-base font-light mb-3" style={{ color: 'var(--brand)' }}>{d.title}</h3>
                <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>{d.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Verdict */}
        <div className="glass-panel p-8 mb-20" style={{ borderColor: 'var(--brand-border)' }}>
          <h2 className="text-lg font-light mb-4">The verdict</h2>
          <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>{data.verdict}</p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-extralight mb-4">See GRID in action</h2>
          <p className="text-sm font-light mb-8" style={{ color: 'var(--text-2)' }}>
            Join the teams building adaptive operations.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/#waitlist"
              className="px-8 py-3.5 text-sm font-light rounded-full transition-all"
              style={{ background: 'var(--brand)', color: '#000', fontWeight: 400 }}
            >
              Get started free
            </Link>
            <Link
              href="/compare"
              className="glass-pill px-8 py-3.5 text-sm font-light"
              style={{ color: 'var(--text-2)' }}
            >
              More comparisons
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
