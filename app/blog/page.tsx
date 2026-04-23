import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog — Insights on AI, Operations, and Adaptive Work',
  description: 'Explore how AI is reshaping business operations. Insights on workflow automation, team productivity, and building adaptive organizations from the GRID team.',
  keywords: ['AI business blog', 'workflow automation insights', 'business operations blog', 'team productivity articles', 'adaptive workspace'],
};

const posts = [
  {
    slug: 'week-1',
    date: '2026-04-22',
    category: 'Build in public',
    title: 'Week 1 — what GRID shipped, in one memo',
    excerpt: 'The first public weekly narrative. GRID runs on GRID; every Monday the Environment page writes a memo like this one. We are posting ours publicly because the product thesis is that work should be legible.',
    readTime: '4 min read',
  },
  {
    slug: 'what-is-an-adaptive-workspace',
    date: '2026-04-10',
    category: 'Product',
    title: 'What Is an Adaptive Workspace?',
    excerpt: 'The next evolution of work management isn\'t about more features — it\'s about systems that learn. Here\'s what "adaptive" actually means and why it matters.',
    readTime: '5 min read',
  },
  {
    slug: 'ai-workflow-automation-vs-traditional',
    date: '2026-04-08',
    category: 'AI & Operations',
    title: 'AI Workflow Automation vs Traditional Automation: What\'s Different',
    excerpt: 'Traditional automation follows rules. AI automation learns patterns. The gap between them is where modern operations are being built.',
    readTime: '7 min read',
  },
  {
    slug: 'operational-clarity-small-teams',
    date: '2026-04-03',
    category: 'Operations',
    title: 'How Small Teams Achieve Operational Clarity Without a COO',
    excerpt: 'You don\'t need a dedicated ops person to understand how your business runs. You need the right system. Here\'s how 5-person teams are getting enterprise-level visibility.',
    readTime: '6 min read',
  },
  {
    slug: 'human-ai-co-learning',
    date: '2026-03-28',
    category: 'Vision',
    title: 'The Co-Learning Model: Why Humans and AI Should Learn the Business Together',
    excerpt: 'Most AI tools do work for you. The ones that matter teach you how to do better work. Here\'s the case for co-learning over co-piloting.',
    readTime: '8 min read',
  },
  {
    slug: 'notion-monday-clickup-what-comes-next',
    date: '2026-03-20',
    category: 'Industry',
    title: 'After Notion, Monday, and ClickUp: What Comes Next in Work Software',
    excerpt: 'The first wave organized work. The second wave tracked it. The third wave will understand it. We\'re building for the third wave.',
    readTime: '6 min read',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen ambient-bg">
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-24 md:py-32">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-light mb-12 transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>
          <span>&larr;</span> Back to GRID
        </Link>

        <p className="text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: 'var(--brand)', opacity: 0.6 }}>
          Blog
        </p>
        <h1 className="text-3xl md:text-5xl font-extralight tracking-tight leading-[1.1] mb-6">
          Thinking about{' '}
          <span style={{ color: 'var(--brand)' }}>adaptive work</span>
        </h1>
        <p className="text-base font-light leading-relaxed max-w-2xl mb-16" style={{ color: 'var(--text-2)' }}>
          Ideas on AI, operations, and building businesses that get smarter over time.
        </p>

        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="glass-panel p-8 block group transition-all hover:scale-[1.005]"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--brand)', opacity: 0.6 }}>{post.category}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>&middot;</span>
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{post.date}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>&middot;</span>
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{post.readTime}</span>
              </div>
              <h2 className="text-lg font-light mb-2 group-hover:text-white/90 transition-colors">{post.title}</h2>
              <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
