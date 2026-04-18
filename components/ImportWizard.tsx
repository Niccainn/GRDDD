'use client';

import { useState } from 'react';
import CSVImporter from './CSVImporter';

type ImportSource = 'notion' | 'asana' | 'monday' | 'csv' | null;

type Props = {
  environmentId: string;
  onComplete: () => void;
  onBack: () => void;
};

const SOURCES = [
  { id: 'notion' as const, name: 'Notion', desc: 'Pages, databases, tasks', color: '#000000', icon: 'N' },
  { id: 'asana' as const, name: 'Asana', desc: 'Tasks, projects, timelines', color: '#F06A6A', icon: 'A' },
  { id: 'monday' as const, name: 'Monday', desc: 'Boards, items, workflows', color: '#FF3D57', icon: 'M' },
  { id: 'csv' as const, name: 'CSV File', desc: 'Import from any spreadsheet', color: '#7193ED', icon: ',' },
];

export default function ImportWizard({ environmentId, onComplete, onBack }: Props) {
  const [source, setSource] = useState<ImportSource>(null);
  const [step, setStep] = useState<'source' | 'select' | 'importing' | 'done'>('source');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ systemsCreated: number; tasksCreated: number } | null>(null);
  const [error, setError] = useState('');

  const handleCSVImport = async (data: { items: Array<{ title: string; description?: string; status?: string; priority?: string; dueDate?: string; labels?: string[]; sourceId: string }> }) => {
    setImporting(true);
    setError('');
    try {
      const systems = [{ name: 'CSV Import', description: 'Imported from CSV file', color: '#7193ED' }];
      const tasks = data.items.map(item => ({
        ...item,
        systemName: 'CSV Import',
        sourceProvider: 'csv',
      }));

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environmentId, systems, tasks, source: 'csv' }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Import failed');
      setResult(result);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleIntegrationImport = async () => {
    if (!source || source === 'csv') return;
    setImporting(true);
    setError('');
    try {
      // For connected integrations, create a system from the source
      const systems = [{ name: `${SOURCES.find(s => s.id === source)?.name} Import`, description: `Imported from ${source}`, color: SOURCES.find(s => s.id === source)?.color }];
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environmentId, systems, tasks: [], source }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Import failed');
      setResult(result);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  // Step: Choose source
  if (step === 'source') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-extralight mb-1">Bring your work</h3>
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            Import from an existing tool or upload a CSV
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {SOURCES.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setSource(s.id);
                if (s.id === 'csv') setStep('select');
                else setStep('select');
              }}
              className="flex items-center gap-3 p-4 rounded-xl text-left transition-all"
              style={{
                background: source === s.id ? 'rgba(21,173,112,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${source === s.id ? 'rgba(21,173,112,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-light flex-shrink-0"
                style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
                {s.icon}
              </div>
              <div>
                <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>{s.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{s.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onBack} className="flex-1 py-2.5 text-xs font-light rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)' }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // Step: Select/configure (CSV or integration)
  if (step === 'select') {
    if (source === 'csv') {
      return (
        <div>
          <h3 className="text-lg font-extralight mb-4">Import CSV</h3>
          <CSVImporter onImport={handleCSVImport} onBack={() => setStep('source')} />
          {importing && (
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--brand)' }} />
              <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Importing...</span>
            </div>
          )}
        </div>
      );
    }

    // Integration source — connect prompt
    const sourceDef = SOURCES.find(s => s.id === source);
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-extralight">Import from {sourceDef?.name}</h3>
        <div className="glass-deep p-5 rounded-xl text-center">
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-lg"
            style={{ background: `${sourceDef?.color}15`, color: sourceDef?.color }}>
            {sourceDef?.icon}
          </div>
          <p className="text-sm font-light mb-2" style={{ color: 'var(--text-1)' }}>
            Connect {sourceDef?.name} to import your data
          </p>
          <p className="text-xs font-light mb-4" style={{ color: 'var(--text-3)' }}>
            We&apos;ll create Grid systems from your {source === 'notion' ? 'databases' : source === 'asana' ? 'projects' : 'boards'}
          </p>
          <a
            href={`/api/integrations/oauth/${source}/start?environmentId=${environmentId}&redirect=/welcome`}
            className="inline-block px-5 py-2.5 text-xs font-light rounded-lg transition-all"
            style={{ background: `${sourceDef?.color}20`, border: `1px solid ${sourceDef?.color}40`, color: sourceDef?.color }}
          >
            Connect {sourceDef?.name}
          </a>
        </div>

        <p className="text-[10px] text-center" style={{ color: 'var(--text-3)' }}>
          Or skip and connect later from Settings
        </p>

        <div className="flex gap-2">
          <button onClick={() => setStep('source')} className="flex-1 py-2.5 text-xs font-light rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)' }}>
            Back
          </button>
          <button onClick={handleIntegrationImport} disabled={importing}
            className="flex-1 py-2.5 text-xs font-light rounded-lg transition-all disabled:opacity-40"
            style={{ background: 'rgba(21,173,112,0.12)', border: '1px solid rgba(21,173,112,0.25)', color: 'var(--brand)' }}>
            {importing ? 'Creating...' : 'Create system & continue'}
          </button>
        </div>

        {error && <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    );
  }

  // Step: Done
  if (step === 'done' && result) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(21,173,112,0.1)', border: '1px solid rgba(21,173,112,0.2)' }}>
          <span className="text-lg" style={{ color: 'var(--brand)' }}>&#10003;</span>
        </div>
        <p className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>Import complete</p>
        <p className="text-xs mb-6" style={{ color: 'var(--text-3)' }}>
          {result.systemsCreated} system{result.systemsCreated !== 1 ? 's' : ''} and{' '}
          {result.tasksCreated} task{result.tasksCreated !== 1 ? 's' : ''} created
        </p>
        <button onClick={onComplete}
          className="px-6 py-2.5 text-xs font-light rounded-lg transition-all"
          style={{ background: 'rgba(21,173,112,0.12)', border: '1px solid rgba(21,173,112,0.25)', color: 'var(--brand)' }}>
          Enter GRID
        </button>
      </div>
    );
  }

  return null;
}
