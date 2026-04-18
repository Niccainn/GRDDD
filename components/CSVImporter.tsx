'use client';

import { useState, useRef } from 'react';

type ColumnMapping = {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  labels?: string;
};

type Props = {
  onImport: (data: { items: Array<{ title: string; description?: string; status?: string; priority?: string; dueDate?: string; labels?: string[]; sourceId: string }> }) => void;
  onBack: () => void;
};

const GRID_FIELDS = [
  { key: 'title', label: 'Title', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'priority', label: 'Priority', required: false },
  { key: 'dueDate', label: 'Due Date', required: false },
  { key: 'labels', label: 'Labels', required: false },
];

export default function CSVImporter({ onImport, onBack }: Props) {
  const [csvContent, setCsvContent] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ title: '' });
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvContent(text);
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { setError('CSV needs a header row and data'); return; }
      const h = lines[0].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      setHeaders(h);
      setRows(lines.slice(1, 6).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, ''))));
      // Auto-map title to first column
      setMapping(prev => ({ ...prev, title: h[0] }));
      setError('');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.tsv'))) {
      const input = fileRef.current;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        handleFile({ target: input } as unknown as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleImport = () => {
    if (!mapping.title) { setError('Title column is required'); return; }
    const lines = csvContent.split('\n').filter(l => l.trim());
    const h = lines[0].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const items = lines.slice(1).map((line, i) => {
      const vals = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const row = Object.fromEntries(h.map((header, idx) => [header, vals[idx] || '']));
      return {
        sourceId: `csv-${i}`,
        title: row[mapping.title] || '',
        description: mapping.description ? row[mapping.description] : undefined,
        status: mapping.status ? row[mapping.status] : undefined,
        priority: mapping.priority ? row[mapping.priority] : undefined,
        dueDate: mapping.dueDate ? row[mapping.dueDate] : undefined,
        labels: mapping.labels ? row[mapping.labels]?.split(';').map(l => l.trim()).filter(Boolean) : undefined,
      };
    }).filter(item => item.title.trim());

    onImport({ items });
  };

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      {headers.length === 0 ? (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center py-12 rounded-xl cursor-pointer"
          style={{ border: '2px dashed rgba(113,147,237,0.2)', background: 'rgba(113,147,237,0.03)' }}
          onClick={() => fileRef.current?.click()}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7193ED" strokeWidth="1.5" className="mb-3">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>Drop a CSV file here</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>or click to browse</p>
          <input ref={fileRef} type="file" accept=".csv,.tsv" onChange={handleFile} className="hidden" />
        </div>
      ) : (
        <>
          {/* Column mapping */}
          <div>
            <p className="text-xs tracking-[0.12em] font-light mb-3" style={{ color: 'var(--text-3)' }}>MAP COLUMNS</p>
            <div className="space-y-2">
              {GRID_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <span className="text-xs font-light w-24" style={{ color: field.required ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {field.label}{field.required ? ' *' : ''}
                  </span>
                  <select
                    value={(mapping as Record<string, string>)[field.key] || ''}
                    onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value || undefined }))}
                    className="flex-1 text-xs py-1.5 px-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-2)' }}
                  >
                    <option value="">— Skip —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="text-xs tracking-[0.12em] font-light mb-2" style={{ color: 'var(--text-3)' }}>
              PREVIEW ({rows.length} of {csvContent.split('\n').length - 1} rows)
            </p>
            <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-[10px]">
                <thead>
                  <tr>{headers.map(h => <th key={h} className="px-2 py-1.5 text-left font-light" style={{ color: 'var(--text-3)', background: 'rgba(255,255,255,0.02)' }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => <td key={j} className="px-2 py-1 font-light truncate max-w-[120px]" style={{ color: 'var(--text-2)', borderTop: '1px solid rgba(255,255,255,0.03)' }}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={onBack} className="flex-1 py-2.5 text-xs font-light rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)' }}>
              Back
            </button>
            <button onClick={handleImport} disabled={!mapping.title}
              className="flex-1 py-2.5 text-xs font-light rounded-lg transition-all disabled:opacity-30"
              style={{ background: 'rgba(21,173,112,0.12)', border: '1px solid rgba(21,173,112,0.25)', color: 'var(--brand)' }}>
              Import {csvContent.split('\n').length - 1} rows
            </button>
          </div>
        </>
      )}

      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}
