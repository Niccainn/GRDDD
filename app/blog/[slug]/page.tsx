import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type Post = {
  title: string;
  metaDescription: string;
  keywords: string[];
  date: string;
  category: string;
  readTime: string;
  sections: { heading?: string; body: string }[];
};

const POSTS: Record<string, Post> = {
  'what-is-an-adaptive-workspace': {
    title: 'What Is an Adaptive Workspace?',
    metaDescription: 'An adaptive workspace learns from how your team works and improves over time. Learn what makes it different from traditional project management tools.',
    keywords: ['adaptive workspace', 'what is adaptive workspace', 'AI workspace', 'future of work management', 'intelligent workspace'],
    date: '2026-04-10',
    category: 'Product',
    readTime: '5 min read',
    sections: [
      { body: 'The work management category has gone through two distinct waves. The first wave — spreadsheets, email, and shared drives — organized information. The second wave — Asana, Monday, Notion, ClickUp — organized work. Both waves solved real problems. But neither wave solved the deeper one: how do you make the way you work actually get better over time?' },
      { heading: 'Static tools for a dynamic problem', body: 'Every work management tool today is essentially static. You set up a project, create tasks, assign owners, track deadlines. The tool does exactly what you tell it to. But it never tells you anything back. It doesn\'t notice that your content review stage takes 3x longer than it should. It doesn\'t flag that onboarding workflows are failing at the same step. It doesn\'t suggest that two teams are solving the same problem in different ways.' },
      { heading: 'What "adaptive" actually means', body: 'An adaptive workspace is one that learns from operational data — not just stores it. Every workflow execution generates signals: how long each stage took, where things got stuck, what the quality of the output was, whether the outcome matched the goal. An adaptive system watches these signals over time and surfaces patterns that humans miss.' },
      { heading: 'The co-learning model', body: 'The key insight is that this isn\'t about AI replacing human judgment. It\'s about AI and humans learning the business together. The human brings context, priorities, and domain expertise. The AI brings pattern recognition, consistency, and tireless observation. Together, they build a system that gets more intelligent every week.' },
      { heading: 'What this looks like in practice', body: 'In an adaptive workspace, a marketing team doesn\'t just run campaigns — they run campaigns through workflows that measure efficiency at every stage. After 10 campaigns, the system knows which content formats produce the best engagement, which review processes are bottlenecks, and which channels deserve more investment. The team didn\'t build dashboards or run analyses. The workspace learned it from the work itself.' },
      { heading: 'Why now?', body: 'Three things converged to make adaptive workspaces possible: AI models capable of genuine pattern recognition across operational data, the maturation of workflow-as-data (every step is a data point), and teams that are exhausted by the gap between the tools they use and the insights they need. The third wave isn\'t about more features. It\'s about systems that understand.' },
    ],
  },
  'ai-workflow-automation-vs-traditional': {
    title: 'AI Workflow Automation vs Traditional Automation: What\'s Different',
    metaDescription: 'Traditional automation follows rules. AI automation learns patterns. Understand the fundamental difference and why it matters for your business operations.',
    keywords: ['AI workflow automation', 'traditional automation vs AI', 'business process automation', 'intelligent automation', 'workflow automation comparison'],
    date: '2026-04-08',
    category: 'AI & Operations',
    readTime: '7 min read',
    sections: [
      { body: 'Automation has been a business buzzword for years. But most of what companies call "automation" is really just rules: if this happens, then do that. It works until it doesn\'t — and when it breaks, someone has to manually fix the rule, test it, and redeploy it. The promise was "set it and forget it." The reality is "set it and maintain it forever."' },
      { heading: 'Rule-based automation', body: 'Traditional automation tools (Zapier, Make, Power Automate, even Asana/Monday automations) work on triggers and actions. When a form is submitted, create a task. When a task is completed, send a notification. When a due date passes, escalate. These automations are powerful for simple, predictable processes. But they have a fundamental limitation: they can\'t adapt to changing conditions.' },
      { heading: 'Pattern-based automation', body: 'AI workflow automation works differently. Instead of following rules, it observes patterns. It notices that customer support tickets about billing always take longer to resolve on Mondays. It sees that content that goes through three review cycles performs worse than content with two cycles. It detects that one team member\'s onboarding approach leads to 40% better client retention.' },
      { heading: 'The feedback loop', body: 'The real difference is the feedback loop. Traditional automation is open-loop: it executes the same way every time regardless of outcome. AI automation is closed-loop: it observes the outcome of each execution and uses that data to improve the next one. This is the difference between a thermostat that\'s set to 72° and a thermostat that learns you like it warmer on weekday mornings.' },
      { heading: 'Where each approach works', body: 'Traditional automation is perfect for truly mechanical processes: data entry, file routing, notifications, simple approvals. AI automation is superior for processes with variability, judgment calls, and quality outcomes: content production, client management, strategic operations, any workflow where "better" is possible.' },
      { heading: 'The practical takeaway', body: 'You don\'t need to replace all your existing automations. But for the workflows that drive your business outcomes — the ones where quality, speed, and continuous improvement matter — pattern-based automation is the next step. And it\'s where GRID lives.' },
    ],
  },
  'operational-clarity-small-teams': {
    title: 'How Small Teams Achieve Operational Clarity Without a COO',
    metaDescription: 'Small teams can get enterprise-level operational visibility without hiring ops staff. Learn how adaptive workspaces make operational clarity accessible to 5-person teams.',
    keywords: ['operational clarity', 'small team operations', 'startup operations', 'business visibility', 'operations without COO'],
    date: '2026-04-03',
    category: 'Operations',
    readTime: '6 min read',
    sections: [
      { body: 'At a 200-person company, there\'s a VP of Operations, a RevOps team, and probably someone whose entire job is maintaining dashboards. At a 5-person startup, the founder does everything — and operational clarity is the first casualty.' },
      { heading: 'The visibility gap', body: 'Small teams have a paradox: they\'re close enough to the work that they feel like they understand it, but they lack the systems to actually prove it. Ask a 5-person team how long their client onboarding takes, and you\'ll get five different answers. Not because anyone is wrong — because nobody is measuring.' },
      { heading: 'The dashboard trap', body: 'The instinct is to build dashboards. Buy Metabase or Looker, connect your data, create charts. But this requires data engineering skills most small teams don\'t have, data that\'s clean enough to query (it never is), and time to maintain dashboards as the business changes. For a small team, the dashboard project itself becomes a bottleneck.' },
      { heading: 'Operational clarity as a byproduct', body: 'The adaptive workspace approach is different: operational clarity isn\'t something you build. It\'s a byproduct of working inside the system. When your workflows run through GRID, operational data is generated automatically. Time per stage, completion rates, quality scores, bottleneck frequency — all captured without anyone doing extra work.' },
      { heading: 'What small-team clarity looks like', body: 'A 5-person agency starts running client projects through GRID workflows. Within two weeks, they can see: which project type is most profitable (accounting for actual time spent, not estimates), where projects consistently get stuck, which team member is most efficient at which stage, and how their delivery speed trends month over month. No dashboards. No data engineering. Just working inside a system that learns.' },
      { heading: 'Scaling clarity, not headcount', body: 'The goal isn\'t to hire a COO. The goal is to not need one yet. GRID gives small teams the operational visibility that used to require a dedicated ops function — so the founder can make informed decisions without building an analytics stack.' },
    ],
  },
  'human-ai-co-learning': {
    title: 'The Co-Learning Model: Why Humans and AI Should Learn the Business Together',
    metaDescription: 'The most powerful AI isn\'t the kind that works for you — it\'s the kind that learns with you. Explore the co-learning model that powers adaptive workspaces.',
    keywords: ['human AI co-learning', 'AI co-pilot vs co-learner', 'human AI collaboration', 'AI learning model', 'adaptive AI'],
    date: '2026-03-28',
    category: 'Vision',
    readTime: '8 min read',
    sections: [
      { body: 'The dominant metaphor for AI in business is the "co-pilot." AI assists you. It drafts your emails, summarizes your meetings, generates your reports. You\'re the pilot; AI is the helper. This metaphor is useful but limiting. It positions AI as a tool that does tasks faster, not as a partner that builds understanding.' },
      { heading: 'The co-pilot problem', body: 'When AI is a co-pilot, it\'s optimized for speed: write this faster, summarize this quicker, generate this automatically. But speed without learning is just faster entropy. You produce more outputs without understanding which outputs matter. The team ships faster but doesn\'t know if it\'s shipping the right things.' },
      { heading: 'Co-learning is different', body: 'In a co-learning model, both the human and the AI are building understanding of the business. The human teaches the AI context: this client is strategic, this workflow matters more than that one, quality trumps speed on this project. The AI teaches the human patterns: this process takes 40% longer than similar ones, this approach consistently produces better outcomes, this bottleneck recurs every month.' },
      { heading: 'Dual-ended improvement', body: 'The result is dual-ended improvement. The human gets better at running operations because AI surfaces insights they\'d otherwise miss. The AI gets better at supporting operations because the human provides context it can\'t derive on its own. Neither side is replaceable. Both sides compound.' },
      { heading: 'What this means for teams', body: 'A team running on a co-learning model doesn\'t just work faster — they work smarter every week. They develop what we call "AI fluency": the ability to work with AI effectively, not just use AI tools. This is a competitive advantage that compounds over time and can\'t be replicated by buying a better tool.' },
      { heading: 'The bet', body: 'We believe the companies that win the next decade won\'t be the ones with the best AI tools. They\'ll be the ones whose teams learned to work with AI earliest and most effectively. The co-learning model isn\'t just a product philosophy — it\'s a thesis about how organizations evolve.' },
    ],
  },
  'notion-monday-clickup-what-comes-next': {
    title: 'After Notion, Monday, and ClickUp: What Comes Next in Work Software',
    metaDescription: 'The first wave organized work. The second wave tracked it. The third wave will understand it. Explore what comes after today\'s work management tools.',
    keywords: ['future of work software', 'after notion monday clickup', 'next generation work tools', 'work management evolution', 'third wave work software'],
    date: '2026-03-20',
    category: 'Industry',
    readTime: '6 min read',
    sections: [
      { body: 'If you\'re running a business in 2026, you\'ve probably used — or at least evaluated — Notion, Monday.com, ClickUp, and Asana. These are excellent products that solved real problems. But they all share a fundamental assumption: the human is responsible for understanding how the business works. The tool just tracks what the human tells it.' },
      { heading: 'Wave 1: Organization (2000-2015)', body: 'The first wave of digital work tools — email, shared drives, spreadsheets, early project managers — solved the organization problem. Work was scattered across desks, filing cabinets, and people\'s memories. These tools gave it a digital home. The unit of work was the file or the message.' },
      { heading: 'Wave 2: Coordination (2015-2025)', body: 'The second wave — Asana, Monday, Notion, ClickUp, Slack — solved the coordination problem. Teams could see each other\'s work, assign tasks, track progress, and communicate in context. The unit of work became the task or the project. This wave gave us incredible visibility into what was being done.' },
      { heading: 'Wave 3: Understanding (2025+)', body: 'The third wave solves the understanding problem. It\'s not enough to see what\'s being done — you need to understand why it works, where it breaks, and how to improve it. The unit of work becomes the system: a connected graph of workflows, goals, and outcomes that reveals how the business actually operates.' },
      { heading: 'What third-wave tools look like', body: 'Third-wave work software is AI-native, not AI-augmented. It generates operational intelligence as a byproduct of normal work. It learns from outcomes, not just inputs. It suggests improvements, not just tracks assignments. And it treats the business as a living system, not a collection of independent projects.' },
      { heading: 'This is what we\'re building', body: 'GRID is a third-wave work platform. We\'re not trying to replace Notion or beat Monday at project tracking. We\'re building for the question that comes after "what\'s getting done?" — the question of "is what we\'re doing actually working?" That question changes everything.' },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) return {};
  return {
    title: post.title,
    description: post.metaDescription,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      type: 'article',
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'GRID Systems Inc.' },
    publisher: { '@type': 'Organization', name: 'GRID Systems Inc.', url: 'https://www.grddd.com' },
  };

  return (
    <div className="min-h-screen ambient-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="max-w-3xl mx-auto px-5 md:px-8 py-24 md:py-32">
        <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-light mb-12 transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>
          <span>&larr;</span> All posts
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--brand)', opacity: 0.6 }}>{post.category}</span>
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>&middot;</span>
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{post.date}</span>
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>&middot;</span>
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{post.readTime}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extralight tracking-tight leading-[1.15] mb-12">
          {post.title}
        </h1>

        <div className="space-y-8">
          {post.sections.map((s, i) => (
            <div key={i}>
              {s.heading && <h2 className="text-xl font-light mb-4">{s.heading}</h2>}
              <p className="text-[15px] font-light leading-[1.9]" style={{ color: 'var(--text-2)' }}>{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-12" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="glass-panel p-8 text-center">
            <h3 className="text-lg font-light mb-3">Build your adaptive workspace</h3>
            <p className="text-sm font-light mb-6" style={{ color: 'var(--text-2)' }}>
              Join the teams already running on GRID.
            </p>
            <Link
              href="/sign-up"
              className="inline-block px-8 py-3.5 text-sm font-light rounded-full transition-all"
              style={{ background: 'var(--brand)', color: '#000', fontWeight: 400 }}
            >
              Request early access
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
