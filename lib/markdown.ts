/**
 * Lightweight markdown-to-HTML renderer.
 * Supports headings, bold, italic, lists, code blocks, inline code,
 * links, blockquotes, horizontal rules, and paragraph breaks.
 * No external dependencies.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderMarkdown(source: string): string {
  if (!source) return '';

  let html = '';
  const lines = source.split('\n');
  let i = 0;
  let inList: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length > 0) {
      html += `<p>${inlineFormat(paragraph.join('\n'))}</p>\n`;
      paragraph = [];
    }
  }

  function flushList() {
    if (inList) {
      html += `</${inList}>\n`;
      inList = null;
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      flushParagraph();
      flushList();
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const escaped = escapeHtml(codeLines.join('\n'));
      html += `<pre><code${lang ? ` class="language-${lang}"` : ''}>${escaped}</code></pre>\n`;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      flushParagraph();
      flushList();
      html += '<hr />\n';
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      html += `<h${level}>${inlineFormat(headingMatch[2])}</h${level}>\n`;
      i++;
      continue;
    }

    // Blockquote
    if (line.trimStart().startsWith('> ')) {
      flushParagraph();
      flushList();
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('> ')) {
        quoteLines.push(lines[i].trimStart().slice(2));
        i++;
      }
      html += `<blockquote>${inlineFormat(quoteLines.join('\n'))}</blockquote>\n`;
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (inList !== 'ul') {
        flushList();
        inList = 'ul';
        html += '<ul>\n';
      }
      html += `<li>${inlineFormat(ulMatch[2])}</li>\n`;
      i++;
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (inList !== 'ol') {
        flushList();
        inList = 'ol';
        html += '<ol>\n';
      }
      html += `<li>${inlineFormat(olMatch[2])}</li>\n`;
      i++;
      continue;
    }

    // Regular text line -- accumulate for paragraph
    flushList();
    paragraph.push(line);
    i++;
  }

  flushParagraph();
  flushList();

  return html;
}

/** Apply inline formatting: bold, italic, code, links */
function inlineFormat(text: string): string {
  let result = escapeHtml(text);

  // Inline code (must come before bold/italic to avoid conflicts)
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  result = result.replace(/_(.+?)_/g, '<em>$1</em>');

  // Links [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Line breaks within paragraphs
  result = result.replace(/\n/g, '<br />');

  return result;
}

/** Count words in a markdown string */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}
