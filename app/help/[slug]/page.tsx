/**
 * /help/[slug] — render one docs/*.md file as a styled page.
 *
 * slug → file mapping is whitelisted so arbitrary /help/../secrets
 * traversal is impossible at the route layer, not just at the fs
 * layer. Also means only the docs we explicitly promote are
 * user-visible; internal ops docs (TESTS.md, PRODUCT_SYNC.md,
 * PRODUCTION_READINESS.md) aren't rendered.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';
import { parseMarkdown, renderNodes } from '@/lib/docs/render';

export const dynamic = 'force-static';

const DOCS: Record<string, { file: string; title: string; description: string }> = {
  quickstart: {
    file: 'QUICKSTART.md',
    title: 'Quickstart',
    description: 'Sign-up to first working workflow in 5 minutes.',
  },
  'user-guide': {
    file: 'USER_GUIDE.md',
    title: 'User Guide',
    description: 'Every feature explained, every click counted.',
  },
  faq: {
    file: 'FAQ.md',
    title: 'FAQ',
    description: 'Common questions about GRID.',
  },
  troubleshooting: {
    file: 'TROUBLESHOOTING.md',
    title: 'Troubleshooting',
    description: 'Specific fixes for specific symptoms.',
  },
  admin: {
    file: 'ADMIN_GUIDE.md',
    title: 'Admin Guide',
    description: 'For operators: env vars, monitoring, releases.',
  },
  'incident-response': {
    file: 'INCIDENT_RESPONSE.md',
    title: 'Incident Response',
    description: 'GDPR breach runbook.',
  },
};

export async function generateStaticParams() {
  return Object.keys(DOCS).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) return { title: 'Help' };
  return { title: doc.title, description: doc.description };
}

export default async function HelpDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();

  // Build-time fs read. The whitelist above prevents traversal; this
  // path is always relative to the repo's docs/ folder.
  let source = '';
  try {
    source = fs.readFileSync(path.join(process.cwd(), 'docs', doc.file), 'utf8');
  } catch {
    notFound();
  }
  const nodes = parseMarkdown(source);

  return (
    <div className="min-h-screen px-5 md:px-8 py-20 md:py-28">
      <div className="max-w-3xl mx-auto">
        <p className="text-[10px] tracking-[0.16em] uppercase mb-3 font-light" style={{ color: 'var(--text-3)' }}>
          <Link href="/help" style={{ color: 'var(--text-3)' }}>← Help Center</Link>
        </p>
        <h1 className="text-3xl md:text-4xl font-extralight tracking-tight mb-2">{doc.title}</h1>
        <p className="text-sm font-light mb-10" style={{ color: 'var(--text-2)' }}>
          {doc.description}
        </p>

        {renderNodes(nodes)}

        <div
          className="mt-16 pt-6 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--glass-border)' }}
        >
          <Link href="/help" className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            ← All resources
          </Link>
          <a
            href={`mailto:support@grid.systems?subject=Feedback on ${doc.title}`}
            className="text-xs font-light"
            style={{ color: 'var(--brand)' }}
          >
            Suggest an improvement →
          </a>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
