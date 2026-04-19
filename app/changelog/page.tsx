/**
 * /changelog — public release history.
 *
 * Reads the CHANGELOG.md at the repo root at BUILD time (server
 * component, no client-side JS). The file is the source of truth so
 * every edit flows through git review — no hand-editing a database.
 *
 * Render strategy: light markdown-to-JSX without a full markdown
 * library. Supports the three things our CHANGELOG actually uses:
 * headings (#, ##, ###), bullets (- or •), and paragraphs. Fenced
 * code blocks aren't used on this page so no special handling.
 */

import type { Metadata } from 'next';
import fs from 'node:fs';
import path from 'node:path';
import LegalFooter from '@/components/LegalFooter';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Release notes and product history for GRID.',
};

export const dynamic = 'force-static'; // re-rendered only at deploy
export const revalidate = false;

function readChangelog(): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'CHANGELOG.md'), 'utf8');
  } catch {
    return '# Changelog\n\nNo entries yet.';
  }
}

type Node =
  | { kind: 'h1' | 'h2' | 'h3'; text: string; id: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'hr' };

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function parseMarkdown(src: string): Node[] {
  const lines = src.split('\n');
  const nodes: Node[] = [];
  let bulletBuf: string[] | null = null;

  const flushBullets = () => {
    if (bulletBuf && bulletBuf.length) {
      nodes.push({ kind: 'ul', items: bulletBuf });
    }
    bulletBuf = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (line.startsWith('### ')) {
      flushBullets();
      const text = line.slice(4);
      nodes.push({ kind: 'h3', text, id: slugify(text) });
    } else if (line.startsWith('## ')) {
      flushBullets();
      const text = line.slice(3);
      nodes.push({ kind: 'h2', text, id: slugify(text) });
    } else if (line.startsWith('# ')) {
      flushBullets();
      const text = line.slice(2);
      nodes.push({ kind: 'h1', text, id: slugify(text) });
    } else if (/^---+\s*$/.test(line)) {
      flushBullets();
      nodes.push({ kind: 'hr' });
    } else if (/^[-•]\s+/.test(line)) {
      if (!bulletBuf) bulletBuf = [];
      bulletBuf.push(line.replace(/^[-•]\s+/, ''));
    } else if (line.trim() === '') {
      flushBullets();
    } else {
      flushBullets();
      nodes.push({ kind: 'p', text: line });
    }
  }
  flushBullets();
  return nodes;
}

/**
 * Lightweight inline-markdown: **bold**, `code`, and [links](url).
 * Intentionally narrower than a full markdown renderer to keep the
 * code surface small and the output auditable.
 */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const m = match[0];
    if (m.startsWith('**')) {
      parts.push(<strong key={match.index} style={{ color: 'var(--text-1)', fontWeight: 500 }}>{m.slice(2, -2)}</strong>);
    } else if (m.startsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--brand)', fontFamily: 'monospace' }}
        >
          {m.slice(1, -1)}
        </code>,
      );
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(m);
      if (linkMatch) {
        parts.push(
          <a key={match.index} href={linkMatch[2]} style={{ color: 'var(--brand)' }} target="_blank" rel="noreferrer noopener">
            {linkMatch[1]}
          </a>,
        );
      } else {
        parts.push(m);
      }
    }
    lastIndex = match.index + m.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default function ChangelogPage() {
  const nodes = parseMarkdown(readChangelog());

  return (
    <div className="min-h-screen px-5 md:px-8 py-20 md:py-28">
      <div className="max-w-3xl mx-auto">
        <p className="text-[10px] tracking-[0.16em] uppercase mb-3 font-light" style={{ color: 'var(--text-3)' }}>
          Release history
        </p>
        <h1 className="text-3xl md:text-4xl font-extralight tracking-tight mb-8">Changelog</h1>

        <div className="space-y-5">
          {nodes.map((node, i) => {
            if (node.kind === 'h1') {
              return null; // redundant with the page title above
            }
            if (node.kind === 'h2') {
              return (
                <h2
                  key={i}
                  id={node.id}
                  className="text-xl font-extralight tracking-tight mt-10 pt-4"
                  style={{ color: 'var(--text-1)', borderTop: '1px solid var(--glass-border)' }}
                >
                  {renderInline(node.text)}
                </h2>
              );
            }
            if (node.kind === 'h3') {
              return (
                <h3
                  key={i}
                  id={node.id}
                  className="text-[10px] tracking-[0.16em] uppercase font-light mt-6 mb-1"
                  style={{ color: 'var(--text-3)' }}
                >
                  {renderInline(node.text)}
                </h3>
              );
            }
            if (node.kind === 'p') {
              return (
                <p key={i} className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {renderInline(node.text)}
                </p>
              );
            }
            if (node.kind === 'ul') {
              return (
                <ul key={i} className="space-y-1.5">
                  {node.items.map((item, j) => (
                    <li
                      key={j}
                      className="text-sm font-light leading-relaxed pl-4 relative"
                      style={{ color: 'var(--text-2)' }}
                    >
                      <span
                        className="absolute left-0 top-2 w-1 h-1 rounded-full"
                        style={{ background: 'var(--text-3)' }}
                        aria-hidden
                      />
                      {renderInline(item)}
                    </li>
                  ))}
                </ul>
              );
            }
            return <hr key={i} style={{ borderColor: 'var(--glass-border)' }} />;
          })}
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
