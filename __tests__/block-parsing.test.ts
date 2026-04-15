import { describe, it, expect } from 'vitest';
import { parseOutputBlocks, substitutePrompt } from '@/lib/agents/run';

describe('parseOutputBlocks', () => {
  it('returns a text block for plain text', () => {
    const blocks = parseOutputBlocks('Hello world');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('text');
    expect(blocks[0].content).toEqual({ markdown: 'Hello world' });
  });

  it('returns empty text for empty string', () => {
    const blocks = parseOutputBlocks('');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('text');
    expect(blocks[0].content).toEqual({ markdown: '' });
  });

  it('parses a tldr block', () => {
    const blocks = parseOutputBlocks('::tldr:: Revenue is up 12%');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('tldr');
    expect(blocks[0].content).toEqual({ text: 'Revenue is up 12%' });
  });

  it('parses heading blocks with levels', () => {
    const blocks = parseOutputBlocks('::heading[1]:: Big Title\n::heading[2]:: Subtitle');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: 'heading', content: { level: 1, text: 'Big Title' } });
    expect(blocks[1]).toEqual({ type: 'heading', content: { level: 2, text: 'Subtitle' } });
  });

  it('parses metric blocks with natural commas in values', () => {
    const blocks = parseOutputBlocks('::metric[label=Revenue, value=$1,240, delta=+12%]::');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('metric');
    const content = blocks[0].content as Record<string, string>;
    expect(content.label).toBe('Revenue');
    expect(content.value).toBe('$1,240');
    expect(content.delta).toBe('+12%');
  });

  it('parses a table block', () => {
    const raw = `::table::
| Name | Score |
| ---- | ----- |
| Alice | 95 |
| Bob | 87 |
::end::`;
    const blocks = parseOutputBlocks(raw);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('table');
    const content = blocks[0].content as { headers: string[]; rows: string[][] };
    expect(content.headers).toEqual(['Name', 'Score']);
    expect(content.rows).toHaveLength(2);
    expect(content.rows[0]).toEqual(['Alice', '95']);
  });

  it('interleaves text and typed blocks', () => {
    const raw = `Some intro text
::tldr:: Summary here
More text
::heading[2]:: Section`;
    const blocks = parseOutputBlocks(raw);
    expect(blocks.map(b => b.type)).toEqual(['text', 'tldr', 'text', 'heading']);
  });
});

describe('substitutePrompt', () => {
  it('replaces {{name}} tokens', () => {
    expect(substitutePrompt('Hello {{name}}!', { name: 'Grid' })).toBe('Hello Grid!');
  });

  it('leaves unknown tokens as-is', () => {
    expect(substitutePrompt('Hello {{unknown}}!', {})).toBe('Hello {{unknown}}!');
  });

  it('handles multiple substitutions', () => {
    const result = substitutePrompt('{{a}} and {{b}}', { a: 'X', b: 'Y' });
    expect(result).toBe('X and Y');
  });

  it('handles whitespace in token names', () => {
    expect(substitutePrompt('{{ name }}', { name: 'ok' })).toBe('ok');
  });
});
