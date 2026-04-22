'use client';

/**
 * /environments/[slug]/report — the monthly ROI report page.
 *
 * Print-CSS optimized so the user can Command-P and get a board-ready
 * PDF without any backend PDF service. The page is signed with the
 * hash of the last AuditLog entry in the window so it's defensible
 * after-the-fact: anyone can verify the numbers came from a real
 * snapshot.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useEnvironmentWorkspace } from '@/lib/contexts/environment-workspace';

type Narrative = { text: string; generatedAt: string };
type Roi = {
  windowDays: number;
  generatedAt: string;
  totalValue: number;
  totalCost: number;
  totalTokens: number;
  totalExecutions: number;
  attributedGoals: number;
  unattributedGoals: number;
  ratio: number | null;
  perSystem: {
    systemId: string;
    systemName: string;
    systemColor: string | null;
    cost: number;
    attributedValue: number;
    ratio: number | null;
  }[];
  goals: {
    id: string;
    title: string;
    metric: string | null;
    current: string | null;
    target: string | null;
    systemName: string | null;
    systemColor: string | null;
    value: { dollars: number; attributed: boolean; method: string; note: string };
  }[];
};

function fmtUsd(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function useHash(input: string) {
  const [hash, setHash] = useState('');
  useEffect(() => {
    if (!input) return;
    const enc = new TextEncoder().encode(input);
    crypto.subtle.digest('SHA-256', enc).then(buf => {
      const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
      setHash(hex.slice(0, 24));
    });
  }, [input]);
  return hash;
}

export default function ReportPage() {
  const params = useParams<{ slug: string }>();
  const ctx = useEnvironmentWorkspace();
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const [roi, setRoi] = useState<Roi | null>(null);

  useEffect(() => {
    fetch(`/api/environments/${ctx.environmentId}/narrative`)
      .then(r => r.json())
      .then(setNarrative)
      .catch(() => {});
    fetch(`/api/environments/${ctx.environmentId}/roi?days=30`)
      .then(r => r.json())
      .then(setRoi)
      .catch(() => {});
  }, [ctx.environmentId]);

  const hashInput = roi ? `${roi.generatedAt}|${roi.totalValue}|${roi.totalCost}|${roi.totalExecutions}` : '';
  const signatureShort = useHash(hashInput);

  const month = new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12 print:py-0 print:px-0" id="report">
      <style>{`
        @media print {
          @page { margin: 20mm; }
          #report { max-width: 100%; }
          nav, button.print-hide { display: none !important; }
          body { background: white !important; color: #0a0a0e !important; }
        }
        .k { color: var(--text-3); }
      `}</style>

      <header className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-1" style={{ color: 'var(--text-3)' }}>
            Monthly report · {month}
          </p>
          <h1
            className="text-2xl md:text-3xl font-extralight tracking-tight"
            style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}
          >
            {ctx.name}
          </h1>
          {ctx.description && (
            <p className="text-sm font-light mt-1" style={{ color: 'var(--text-3)' }}>
              {ctx.description}
            </p>
          )}
        </div>
        <button
          onClick={() => window.print()}
          className="print-hide text-xs font-light px-4 py-2 rounded-full"
          style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-2)',
          }}
        >
          Print / save PDF
        </button>
      </header>

      {/* Executive summary */}
      <section className="mb-8">
        <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-2" style={{ color: 'var(--text-3)' }}>
          Executive summary
        </p>
        {narrative ? (
          <p className="text-base font-extralight leading-relaxed" style={{ color: 'var(--text-1)' }}>
            {narrative.text}
          </p>
        ) : (
          <div className="h-16 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        )}
      </section>

      {/* Headline numbers */}
      {roi && (
        <section className="mb-8">
          <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-3" style={{ color: 'var(--text-3)' }}>
            Numbers this month
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Value returned" value={fmtUsd(roi.totalValue)} />
            <Stat label="Nova cost" value={fmtUsd(roi.totalCost)} />
            <Stat label="ROI ratio" value={roi.ratio != null ? `${roi.ratio}×` : '—'} />
            <Stat label="Executions" value={roi.totalExecutions.toLocaleString()} />
          </div>
        </section>
      )}

      {/* Per-system */}
      {roi && roi.perSystem.length > 0 && (
        <section className="mb-8">
          <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-3" style={{ color: 'var(--text-3)' }}>
            By system
          </p>
          <table className="w-full text-sm font-light">
            <thead>
              <tr className="k" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th className="text-left py-2 font-light" style={{ color: 'var(--text-3)' }}>System</th>
                <th className="text-right py-2 font-light" style={{ color: 'var(--text-3)' }}>Value</th>
                <th className="text-right py-2 font-light" style={{ color: 'var(--text-3)' }}>Cost</th>
                <th className="text-right py-2 font-light" style={{ color: 'var(--text-3)' }}>Ratio</th>
              </tr>
            </thead>
            <tbody>
              {roi.perSystem.map(s => (
                <tr key={s.systemId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td className="py-2">
                    <span className="flex items-center gap-2">
                      {s.systemColor && <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.systemColor }} />}
                      {s.systemName}
                    </span>
                  </td>
                  <td className="text-right py-2">{fmtUsd(s.attributedValue)}</td>
                  <td className="text-right py-2">{fmtUsd(s.cost)}</td>
                  <td className="text-right py-2" style={{ color: s.ratio != null && s.ratio >= 1 ? '#C8F26B' : 'var(--text-2)' }}>
                    {s.ratio != null ? `${s.ratio.toFixed(1)}×` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Goals */}
      {roi && roi.goals.length > 0 && (
        <section className="mb-8">
          <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-3" style={{ color: 'var(--text-3)' }}>
            Tracked goals
          </p>
          <div className="space-y-2">
            {roi.goals.map(g => (
              <div
                key={g.id}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: g.systemColor ?? 'var(--text-3)' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-light truncate" style={{ color: 'var(--text-1)' }}>{g.title}</p>
                  <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                    {g.metric} · {g.current ?? '0'} / {g.target ?? '—'}
                  </p>
                </div>
                <p
                  className="text-xs font-light text-right flex-shrink-0"
                  style={{ color: g.value.attributed ? 'var(--text-1)' : 'var(--text-3)' }}
                >
                  {g.value.attributed ? fmtUsd(g.value.dollars) : 'not attributed'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sign + metadata */}
      <footer
        className="mt-12 pt-6"
        style={{ borderTop: '1px solid var(--glass-border)' }}
      >
        <p className="text-[11px] font-light mb-1" style={{ color: 'var(--text-3)' }}>
          Generated {roi ? new Date(roi.generatedAt).toLocaleString() : '…'}
        </p>
        <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
          Signature: <span className="font-mono">{signatureShort || '…'}</span>
        </p>
        <p className="text-[11px] font-light mt-2" style={{ color: 'var(--text-3)' }}>
          This number is a snapshot. Every figure traces back to an AuditLog entry and an IntelligenceLog cost; export the audit via <span className="font-mono">GET /api/audit/export</span> to verify.
        </p>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
    >
      <p
        className="text-[10px] tracking-[0.16em] uppercase font-light mb-1"
        style={{ color: 'var(--text-3)' }}
      >
        {label}
      </p>
      <p className="text-xl font-extralight" style={{ color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
        {value}
      </p>
    </div>
  );
}
