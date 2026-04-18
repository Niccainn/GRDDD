import type { ImportItem } from './normalize';
import { normalizeStatus, normalizePriority } from './normalize';

export type CSVColumnMapping = {
  title: string;        // required — which CSV column maps to task title
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  labels?: string;
};

/**
 * Parse a CSV string into normalized import items using the provided column mapping.
 */
export function parseCSV(csvContent: string, mapping: CSVColumnMapping): {
  items: ImportItem[];
  headers: string[];
  rowCount: number;
  errors: string[];
} {
  const lines = csvContent.split('\n').filter(l => l.trim());
  if (lines.length < 2) {
    return { items: [], headers: [], rowCount: 0, errors: ['CSV must have a header row and at least one data row'] };
  }

  const headers = parseCSVRow(lines[0]);
  const errors: string[] = [];

  // Validate mapping
  if (!mapping.title || !headers.includes(mapping.title)) {
    return { items: [], headers, rowCount: 0, errors: [`Title column "${mapping.title}" not found in CSV headers`] };
  }

  const items: ImportItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i]);
    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: column count mismatch (expected ${headers.length}, got ${values.length})`);
      continue;
    }

    const row = Object.fromEntries(headers.map((h, idx) => [h, values[idx]]));
    const title = row[mapping.title]?.trim();
    if (!title) {
      errors.push(`Row ${i + 1}: empty title, skipped`);
      continue;
    }

    items.push({
      sourceId: `csv-row-${i}`,
      title,
      description: mapping.description ? row[mapping.description]?.trim() : undefined,
      status: mapping.status ? normalizeStatus(row[mapping.status]) : 'TODO',
      priority: mapping.priority ? normalizePriority(row[mapping.priority]) : 'NORMAL',
      dueDate: mapping.dueDate ? parseDateLoose(row[mapping.dueDate]) : undefined,
      labels: mapping.labels ? row[mapping.labels]?.split(',').map(l => l.trim()).filter(Boolean) : undefined,
      groupName: 'CSV Import',
    });
  }

  return { items, headers, rowCount: lines.length - 1, errors };
}

/** Parse a single CSV row respecting quoted fields */
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/** Attempt to parse various date formats */
function parseDateLoose(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const d = new Date(raw.trim());
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}
