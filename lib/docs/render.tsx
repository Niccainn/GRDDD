/**
 * Shared markdown renderer used by /help/[slug] and /changelog.
 * Intentionally narrow — supports only the constructs our
 * user-facing docs actually use:
 *
 *   - Headings: # / ## / ###
 *   - Paragraphs
 *   - Bullet lists: -, •
 *   - Ordered lists: 1., 2., …
 *   - Horizontal rules: ---
 *   - Inline: **bold**, `code`, [link](url)
 *   - Block quotes: > …
 *   - Tables (pipe syntax)
 *
 * No HTML escaping gotchas because we render through React, not raw
 * HTML. No fenced code blocks (we don't use them in user docs).
 *
 * The narrow scope keeps the auditable surface small — there's no
 * sanitiser-bypass risk because we never dangerouslySetInnerHTML.
 */

import type { ReactNode } from 'react';

type Node =
  | { kind: 'h1' | 'h2' | 'h3'; text: string; id: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'hr' }
  | { kind: 'quote'; text: string }
  | { kind: 'table'; header: string[]; rows: string[][] };

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function parseTable(lines: string[], start: number): { node: Node; consumed: number } | null {
  const header = lines[start];
  const sep = lines[start + 1];
  if (!header?.includes('|') || !sep?.match(/^\|?[\s\-:|]+\|?$/)) return null;

  const cells = (line: string) =>
    line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());

  const headerCells = cells(header);
  const rows: string[][] = [];
  let i = start + 2;
  while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
    rows.push(cells(lines[i]));
    i++;
  }
  return {
    node: { kind: 'table', header: headerCells, rows },
    consumed: i - start,
  };
}

export function parseMarkdown(src: string): Node[] {
  const lines = src.split('\n');
  const nodes: Node[] = [];
  let bulletBuf: string[] | null = null;
  let orderedBuf: string[] | null = null;
  let quoteBuf: string[] | null = null;

  const flush = () => {
    if (bulletBuf?.length) nodes.push({ kind: 'ul', items: bulletBuf });
    if (orderedBuf?.length) nodes.push({ kind: 'ol', items: orderedBuf });
    if (quoteBuf?.length) nodes.push({ kind: 'quote', text: quoteBuf.join(' ') });
    bulletBuf = orderedBuf = quoteBuf = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/\s+$/, '');

    // Tables (look-ahead)
    if (raw.includes('|') && lines[i + 1]?.match(/^\|?[\s\-:|]+\|?$/)) {
      flush();
      const table = parseTable(lines, i);
      if (table) {
        nodes.push(table.node);
        i += table.consumed - 1;
        continue;
      }
    }

    if (raw.startsWith('### ')) {
      flush();
      const text = raw.slice(4);
      nodes.push({ kind: 'h3', text, id: slugify(text) });
    } else if (raw.startsWith('## ')) {
      flush();
      const text = raw.slice(3);
      nodes.push({ kind: 'h2', text, id: slugify(text) });
    } else if (raw.startsWith('# ')) {
      flush();
      const text = raw.slice(2);
      nodes.push({ kind: 'h1', text, id: slugify(text) });
    } else if (/^---+\s*$/.test(raw)) {
      flush();
      nodes.push({ kind: 'hr' });
    } else if (/^[-•]\s+/.test(raw)) {
      if (!bulletBuf) { flush(); bulletBuf = []; }
      bulletBuf.push(raw.replace(/^[-•]\s+/, ''));
    } else if (/^\d+\.\s+/.test(raw)) {
      if (!orderedBuf) { flush(); orderedBuf = []; }
      orderedBuf.push(raw.replace(/^\d+\.\s+/, ''));
    } else if (raw.startsWith('> ')) {
      if (!quoteBuf) { flush(); quoteBuf = []; }
      quoteBuf.push(raw.slice(2));
    } else if (raw.trim() === '') {
      flush();
    } else {
      flush();
      nodes.push({ kind: 'p', text: raw });
    }
  }
  flush();
  return nodes;
}

/**
 * Inline markdown: **bold**, `code`, [link](url). No nesting beyond
 * these three — they never interleave in our docs.
 */
export function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const m = match[0];
    if (m.startsWith('**')) {
      parts.push(<strong key={key++} style={{ color: 'var(--text-1)', fontWeight: 500 }}>{m.slice(2, -2)}</strong>);
    } else if (m.startsWith('`')) {
      parts.push(
        <code
          key={key++}
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--brand)', fontFamily: 'monospace' }}
        >
          {m.slice(1, -1)}
        </code>,
      );
    } else {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(m);
      if (lm) {
        const isExternal = lm[2].startsWith('http');
        parts.push(
          <a
            key={key++}
            href={lm[2]}
            style={{ color: 'var(--brand)' }}
            {...(isExternal ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
          >
            {lm[1]}
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

export function renderNodes(nodes: Node[]): ReactNode {
  return (
    <div className="space-y-5">
      {nodes.map((node, i) => {
        if (node.kind === 'h1') {
          return null; // title is rendered by the page wrapper
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
              className="text-sm font-light mt-6 mb-1"
              style={{ color: 'var(--text-1)' }}
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
        if (node.kind === 'quote') {
          return (
            <blockquote
              key={i}
              className="text-sm font-light italic leading-relaxed pl-4"
              style={{ color: 'var(--text-3)', borderLeft: '2px solid var(--glass-border)' }}
            >
              {renderInline(node.text)}
            </blockquote>
          );
        }
        if (node.kind === 'ul') {
          return (
            <ul key={i} className="space-y-1.5">
              {node.items.map((item, j) => (
                <li key={j} className="text-sm font-light leading-relaxed pl-4 relative" style={{ color: 'var(--text-2)' }}>
                  <span className="absolute left-0 top-2 w-1 h-1 rounded-full" style={{ background: 'var(--text-3)' }} aria-hidden />
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }
        if (node.kind === 'ol') {
          return (
            <ol key={i} className="space-y-1.5 list-decimal ml-5">
              {node.items.map((item, j) => (
                <li key={j} className="text-sm font-light leading-relaxed pl-1" style={{ color: 'var(--text-2)' }}>
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          );
        }
        if (node.kind === 'hr') {
          return <hr key={i} style={{ borderColor: 'var(--glass-border)' }} />;
        }
        if (node.kind === 'table') {
          return (
            <div key={i} className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--glass-border)' }}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                    {node.header.map((h, j) => (
                      <th key={j} className="py-2.5 px-3 font-light tracking-wide" style={{ color: 'var(--text-3)' }}>
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {node.rows.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="py-2.5 px-3 font-light align-top" style={{ color: 'var(--text-2)' }}>
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
