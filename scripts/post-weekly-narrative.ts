/**
 * scripts/post-weekly-narrative.ts
 *
 * Runs GRID on GRID: generates this week's narrative for a chosen
 * Environment and writes it to disk as a new /blog/week-N/page.tsx
 * file. Also updates app/blog/page.tsx to include the new entry at
 * the top of the list.
 *
 * Trigger: run weekly via cron (Monday 09:00 UTC) or manually:
 *
 *   npx tsx scripts/post-weekly-narrative.ts \
 *     --environmentId=ENV_ID \
 *     [--week=N] \
 *     [--dry]
 *
 * If --week is omitted, the script looks at existing /blog/week-N
 * directories and picks the next integer. If --dry is set, it only
 * prints the narrative text and the files it would write, without
 * touching the filesystem.
 *
 * Voice: memo, not marketing. The narrative endpoint's server prompt
 * enforces this; the script does not add adverbs on top.
 */

import { prisma } from '@/lib/db';
import fs from 'node:fs';
import path from 'node:path';

type Args = {
  environmentId: string | null;
  week: number | null;
  dry: boolean;
};

function parseArgs(): Args {
  const out: Args = { environmentId: null, week: null, dry: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry') out.dry = true;
    else if (arg.startsWith('--environmentId=')) out.environmentId = arg.split('=', 2)[1];
    else if (arg.startsWith('--week=')) out.week = parseInt(arg.split('=', 2)[1], 10);
  }
  return out;
}

function blogDir(): string {
  return path.join(process.cwd(), 'app', 'blog');
}

function nextWeekNumber(): number {
  try {
    const entries = fs.readdirSync(blogDir(), { withFileTypes: true });
    const weekNums = entries
      .filter(e => e.isDirectory() && /^week-\d+$/.test(e.name))
      .map(e => parseInt(e.name.replace('week-', ''), 10))
      .filter(n => Number.isFinite(n));
    return weekNums.length === 0 ? 2 : Math.max(...weekNums) + 1;
  } catch {
    return 2;
  }
}

async function fetchNarrative(environmentId: string): Promise<{ text: string; basis: { audits: number; signals: number; goals: number }; generatedAt: string } | null> {
  // Replicate the narrative API's data gathering without needing a
  // running server. Identical shape and fallback semantics.
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const since = new Date(Date.now() - 7 * MS_PER_DAY);

  const [env, audits, signals, goals] = await Promise.all([
    prisma.environment.findFirst({
      where: { id: environmentId, deletedAt: null },
      select: { id: true, name: true },
    }),
    prisma.auditLog.findMany({
      where: { environmentId, createdAt: { gte: since } },
      select: { action: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.signal.findMany({
      where: { environmentId, createdAt: { gte: since } },
      select: { title: true, priority: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
    prisma.goal.findMany({
      where: { environmentId },
      select: { title: true, status: true, progress: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
  ]);
  if (!env) return null;

  const basis = { audits: audits.length, signals: signals.length, goals: goals.length };
  const context = [
    `Environment: ${env.name}`,
    '',
    `Audit actions (7d): ${audits.map(a => a.action).join(', ') || '(none)'}`,
    '',
    `Signals: ${signals.map(s => `[${s.priority}/${s.status}] ${s.title}`).join(' | ') || '(none)'}`,
    '',
    `Goals: ${goals.map(g => `${g.title} — ${g.status} — ${g.progress ?? 0}%`).join(' | ') || '(none)'}`,
  ].join('\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      text: `This week the Environment saw ${basis.audits} audited actions across ${basis.signals} inbound signals, tracked against ${basis.goals} goals. The narrative API requires ANTHROPIC_API_KEY to render a real memo — this placeholder preserves the cadence.`,
      basis,
      generatedAt: new Date().toISOString(),
    };
  }

  const systemPrompt = [
    'You write weekly narratives for business Environments.',
    'Voice: memo, not marketing. Short sentences. Concrete nouns.',
    'No adverbs like "seamlessly", "effortlessly", "powerfully".',
    'Exactly five sentences. No bullets, headings, or emoji.',
    'Sentence 1: the single most important thing that happened.',
    'Sentence 2: one trend or metric that moved and why it moved.',
    'Sentence 3: one exception or risk worth attention this week.',
    'Sentence 4: what Nova handled autonomously and what was overridden.',
    'Sentence 5: one specific thing to decide or ship next week.',
  ].join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: context }],
    }),
  });
  if (!res.ok) {
    return {
      text: `Claude returned ${res.status} when asked to write this week's narrative. Skipping.`,
      basis,
      generatedAt: new Date().toISOString(),
    };
  }
  const data: { content?: { text?: string }[] } = await res.json();
  const raw = Array.isArray(data.content) ? data.content.map(c => c.text ?? '').join('') : '';
  const stripped = raw.replace(/\b(seamlessly|effortlessly|powerfully|revolutionary|simply)\b/gi, '').replace(/ {2,}/g, ' ').trim();

  return {
    text: stripped || `No narrative generated (empty response). ${basis.audits} audits in the window.`,
    basis,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Render the page file. Each weekly post is one static page so the
 * cadence is versioned in git and trivially cacheable.
 */
function renderPage(week: number, narrative: string, basis: { audits: number; signals: number; goals: number }, generatedAt: string): string {
  const escaped = narrative.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return `/**
 * /blog/week-${week} — weekly narrative, auto-posted by
 * scripts/post-weekly-narrative.ts. Running GRID on GRID.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

export const metadata: Metadata = {
  title: 'Week ${week} — weekly narrative · Blog',
  description: 'Weekly narrative from GRID\\'s own Environment. Generated by Nova from 7 days of AuditLog, signals, and goal deltas.',
};

export default function Week${week}Page() {
  return (
    <div className="min-h-screen ambient-bg">
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-xs font-light mb-12 transition-colors hover:text-white/60"
          style={{ color: 'var(--text-3)' }}
        >
          <span>&larr;</span> Blog
        </Link>

        <p
          className="text-[10px] tracking-[0.18em] uppercase mb-3 font-light"
          style={{ color: 'var(--brand)', opacity: 0.8 }}
        >
          Week ${week} · Build in public
        </p>
        <h1
          className="text-2xl md:text-3xl font-extralight tracking-tight leading-[1.2] mb-4"
          style={{ letterSpacing: '-0.02em' }}
        >
          What GRID did, in one memo
        </h1>
        <p className="text-xs font-light mb-10" style={{ color: 'var(--text-3)' }}>
          Generated ${new Date(generatedAt).toISOString()} · drawn from ${basis.audits} audit actions, ${basis.signals} signals, ${basis.goals} goals.
        </p>

        <p
          className="text-base md:text-lg font-extralight leading-relaxed blog-prose"
          style={{ color: 'var(--text-1)', letterSpacing: '-0.005em' }}
        >
          {\`${escaped}\`}
        </p>

        <p className="text-[11px] font-light mt-12" style={{ color: 'var(--text-3)' }}>
          <Link href="/#waitlist" style={{ color: 'var(--brand)' }}>Request access</Link>
          {' · '}
          <Link href="/blog" style={{ color: 'var(--brand)' }}>All weeks</Link>
        </p>
      </div>
      <LegalFooter />
    </div>
  );
}
`;
}

/**
 * Prepend the new post to the blog index so it shows up at the top.
 * Matches the existing const posts = [ ... ] structure.
 */
function updateBlogIndex(week: number, narrative: string): boolean {
  const indexPath = path.join(blogDir(), 'page.tsx');
  const src = fs.readFileSync(indexPath, 'utf8');
  const excerpt = narrative.split('.').slice(0, 2).join('.').trim() + '.';
  const newEntry = `  {
    slug: 'week-${week}',
    date: '${new Date().toISOString().slice(0, 10)}',
    category: 'Build in public',
    title: 'Week ${week} — what GRID did, in one memo',
    excerpt: ${JSON.stringify(excerpt)},
    readTime: '2 min read',
  },`;

  const marker = 'const posts = [';
  const idx = src.indexOf(marker);
  if (idx < 0) {
    console.error('Could not find const posts = [ in blog index.');
    return false;
  }
  const insertAt = idx + marker.length;
  const updated = src.slice(0, insertAt) + '\n' + newEntry + src.slice(insertAt);
  fs.writeFileSync(indexPath, updated, 'utf8');
  return true;
}

async function main() {
  const args = parseArgs();
  if (!args.environmentId) {
    console.error('Required: --environmentId=ID');
    process.exit(1);
  }
  const week = args.week ?? nextWeekNumber();
  console.log(`Generating narrative for week ${week}…`);

  const narrative = await fetchNarrative(args.environmentId);
  if (!narrative) {
    console.error('Environment not found or narrative generation failed.');
    process.exit(2);
  }

  console.log('\n--- Narrative ---');
  console.log(narrative.text);
  console.log('--- Basis ---');
  console.log(`audits=${narrative.basis.audits} signals=${narrative.basis.signals} goals=${narrative.basis.goals}`);

  if (args.dry) {
    console.log('\nDry run — no files written.');
    return;
  }

  const outDir = path.join(blogDir(), `week-${week}`);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'page.tsx');
  if (fs.existsSync(outFile)) {
    console.error(`Refusing to overwrite existing ${outFile}.`);
    process.exit(3);
  }
  fs.writeFileSync(outFile, renderPage(week, narrative.text, narrative.basis, narrative.generatedAt), 'utf8');
  console.log(`Wrote ${outFile}.`);

  const ok = updateBlogIndex(week, narrative.text);
  if (ok) console.log('Updated blog index.');
}

main()
  .catch(err => {
    console.error(err);
    process.exit(99);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
