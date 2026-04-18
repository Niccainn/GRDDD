import { describe, it, expect } from 'vitest';
import { parseCSV } from '../lib/integrations/import/csv-parser';

const MAP = { title: 'Name', status: 'Status', priority: 'Priority', dueDate: 'Due', labels: 'Tags', description: 'Notes' };

describe('parseCSV', () => {
  it('returns an error when CSV has no data rows', () => {
    const { errors, items } = parseCSV('Name,Status', { title: 'Name' });
    expect(items).toHaveLength(0);
    expect(errors[0]).toMatch(/header row/i);
  });

  it('returns an error when title column is missing', () => {
    const { errors, items } = parseCSV('Title,Status\nA,done', { title: 'Name' });
    expect(items).toHaveLength(0);
    expect(errors[0]).toMatch(/Title column "Name" not found/);
  });

  it('parses a simple CSV', () => {
    const csv = 'Name,Status\nTask A,done\nTask B,todo';
    const { items, errors } = parseCSV(csv, { title: 'Name', status: 'Status' });
    expect(errors).toHaveLength(0);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: 'Task A', status: 'DONE' });
    expect(items[1]).toMatchObject({ title: 'Task B', status: 'TODO' });
  });

  it('respects quoted fields containing commas', () => {
    const csv = 'Name,Notes\n"Ship, then polish","Comma, inside"';
    const { items } = parseCSV(csv, { title: 'Name', description: 'Notes' });
    expect(items[0].title).toBe('Ship, then polish');
    expect(items[0].description).toBe('Comma, inside');
  });

  it('handles escaped double quotes inside quoted fields', () => {
    const csv = 'Name\n"She said ""hi"""';
    const { items } = parseCSV(csv, { title: 'Name' });
    expect(items[0].title).toBe('She said "hi"');
  });

  it('strips blank/whitespace lines entirely', () => {
    const csv = 'Name\nFoo\n\n  \nBar';
    const { items, errors } = parseCSV(csv, { title: 'Name' });
    expect(items.map(i => i.title)).toEqual(['Foo', 'Bar']);
    expect(errors).toHaveLength(0);
  });

  it('reports rows whose title cell is empty after parse', () => {
    // Column count matches (2) but the Name cell is empty, not the line.
    const csv = 'Name,Status\n,done\nKept,todo';
    const { items, errors } = parseCSV(csv, { title: 'Name' });
    expect(items.map(i => i.title)).toEqual(['Kept']);
    expect(errors.some(e => /empty title/i.test(e))).toBe(true);
  });

  it('reports column-count mismatch', () => {
    const csv = 'Name,Status\nFoo,done,extra';
    const { items, errors } = parseCSV(csv, { title: 'Name' });
    expect(items).toHaveLength(0);
    expect(errors[0]).toMatch(/column count mismatch/);
  });

  it('parses labels as a comma-separated list', () => {
    const csv = 'Name,Tags\nTask,"red, urgent,  backend"';
    const { items } = parseCSV(csv, { title: 'Name', labels: 'Tags' });
    expect(items[0].labels).toEqual(['red', 'urgent', 'backend']);
  });

  it('parses loose date formats or drops invalid ones', () => {
    const csv = 'Name,Due\nA,2026-05-01\nB,not-a-date';
    const { items } = parseCSV(csv, { title: 'Name', dueDate: 'Due' });
    expect(items[0].dueDate).toMatch(/^2026-05-01T/);
    expect(items[1].dueDate).toBeUndefined();
  });

  it('defaults status/priority when columns not mapped', () => {
    const csv = 'Name\nSolo';
    const { items } = parseCSV(csv, { title: 'Name' });
    expect(items[0].status).toBe('TODO');
    expect(items[0].priority).toBe('NORMAL');
  });

  it('full mapping round-trip', () => {
    const csv = [
      'Name,Status,Priority,Due,Tags,Notes',
      'Task,IN PROGRESS,urgent,2026-06-01,"a,b",Some notes',
    ].join('\n');
    const { items, errors } = parseCSV(csv, MAP);
    expect(errors).toHaveLength(0);
    expect(items[0]).toMatchObject({
      title: 'Task',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      labels: ['a', 'b'],
      description: 'Some notes',
      groupName: 'CSV Import',
    });
    expect(items[0].dueDate).toMatch(/^2026-06-01T/);
    expect(items[0].sourceId).toMatch(/^csv-row-/);
  });
});
