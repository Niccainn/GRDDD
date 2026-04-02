'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type Execution = {
  id: string;
  status: string;
  input: string;
  currentStage: number | null;
  createdAt: string;
  completedAt: string | null;
  system: { id: string; name: string };
  workflow: { id: string; name: string } | null;
  validationScore: number | null;
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#15AD70',
  RUNNING: '#7193ED',
  FAILED: '#FF6B6B',
  CANCELLED: 'rgba(255,255,255,0.3)',
};

const STATUS_BG: Record<string, string> = {
  COMPLETED: 'rgba(21,173,112,0.08)',
  RUNNING: 'rgba(113,147,237,0.08)',
  FAILED: 'rgba(255,107,107,0.08)',
  CANCELLED: 'rgba(255,255,255,0.04)',
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function duration(start: string, end: string | null) {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function ScoreDot({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? '#15AD70' : pct >= 60 ? '#F7C700' : '#FF6B6B';
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {pct}%
    </span>
  );
}

const STATUSES = ['COMPLETED', 'RUNNING', 'FAILED', 'CANCELLED'];
const PAGE_SIZE = 25;

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, { output: string; validation: { score: number; issues: string[]; summary: string | null } | null }>>({});

  const load = useCallback(() => {
    setLoaded(false);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
      ...(statusFilter ? { status: statusFilter } : {}),
    });
    fetch(`/api/executions?${params}`)
      .then(r => r.json())
      .then(d => {
        setExecutions(d.executions ?? []);
        setTotal(d.total ?? 0);
        setLoaded(true);
      });
  }, [statusFilter, offset]);

  useEffect(() => { load(); }, [load]);

  // Reset offset when filter changes
  useEffect(() => { setOffset(0); }, [statusFilter]);

  async function loadDetail(id: string) {
    if (detail[id]) return;
    const d = await fetch(`/api/executions/${id}`).then(r => r.json());
    let parsedOutput: { stage: string; output: string }[] = [];
    try { parsedOutput = JSON.parse(d.output ?? '[]'); } catch { parsedOutput = []; }
    setDetail(prev => ({ ...prev, [id]: { output: d.output ?? '', validation: d.validation } }));
  }

  function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      loadDetail(id);
    }
  }

  const pages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">Executions</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {loaded ? `${total.toLocaleString()} run${total !== 1 ? 's' : ''} total` : 'Loading···'}
          </p>
        </div>

        {/* Live refresh indicator */}
        <button onClick={load} className="flex items-center gap-1.5 text-xs font-light px-3 py-1.5 rounded-lg transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'rgba(255,255,255,0.3)' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 mb-6">
        {['', ...STATUSES].map(s => (
          <button key={s || 'all'} onClick={() => setStatusFilter(s)}
            className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
            style={{
              background: statusFilter === s ? (s ? STATUS_BG[s] : 'rgba(255,255,255,0.08)') : 'transparent',
              border: `1px solid ${statusFilter === s ? (s ? STATUS_COLOR[s] + '30' : 'rgba(255,255,255,0.15)') : 'transparent'}`,
              color: s
                ? (statusFilter === s ? STATUS_COLOR[s] : 'rgba(255,255,255,0.3)')
                : (statusFilter === '' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)'),
            }}>
            {s ? s.toLowerCase() : 'all'}
          </button>
        ))}
      </div>

      {/* Table */}
      {!loaded ? (
        <div className="space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : executions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl" style={{ border: '1px dashed var(--border)' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-secondary)' }}>No executions yet</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Runs will appear here when workflows are executed via Nova
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {executions.map(ex => {
            const isExpanded = expanded === ex.id;
            const d = detail[ex.id];

            return (
              <div key={ex.id}
                className="rounded-xl overflow-hidden"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {/* Row */}
                <button
                  onClick={() => toggleExpand(ex.id)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all"
                  style={{ borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>

                  {/* Status pill */}
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-light"
                    style={{
                      background: STATUS_BG[ex.status] ?? 'rgba(255,255,255,0.04)',
                      color: STATUS_COLOR[ex.status] ?? 'rgba(255,255,255,0.4)',
                    }}>
                    {ex.status === 'RUNNING' && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse"
                        style={{ backgroundColor: '#7193ED', verticalAlign: 'middle' }} />
                    )}
                    {ex.status.toLowerCase()}
                  </span>

                  {/* Input */}
                  <p className="flex-1 text-sm font-light truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {ex.input}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {ex.validationScore !== null && <ScoreDot score={ex.validationScore} />}

                    {ex.workflow && (
                      <span className="text-xs hidden md:block" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {ex.workflow.name}
                      </span>
                    )}

                    <Link
                      href={`/systems/${ex.system.id}`}
                      onClick={e => e.stopPropagation()}
                      className="text-xs transition-colors"
                      style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {ex.system.name}
                    </Link>

                    {ex.completedAt && (
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        {duration(ex.createdAt, ex.completedAt)}
                      </span>
                    )}

                    <span className="text-xs w-16 text-right" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {timeAgo(ex.createdAt)}
                    </span>

                    <svg
                      width="12" height="12" viewBox="0 0 12 12" fill="none"
                      style={{ color: 'rgba(255,255,255,0.2)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>

                {/* Expanded output */}
                {isExpanded && (
                  <div className="px-5 py-4 space-y-3">
                    {!d ? (
                      <div className="h-12 animate-pulse rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    ) : (() => {
                      let stages: { stage: string; output: string }[] = [];
                      try { stages = JSON.parse(d.output); } catch { stages = []; }

                      return (
                        <>
                          {stages.length > 0 ? (
                            <div className="space-y-3">
                              {stages.map((s, i) => (
                                <div key={i}>
                                  <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    {s.stage}
                                  </p>
                                  <p className="text-sm font-light leading-relaxed whitespace-pre-wrap"
                                    style={{ color: 'rgba(255,255,255,0.6)' }}>
                                    {s.output.slice(0, 600)}{s.output.length > 600 ? '···' : ''}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : d.output ? (
                            <p className="text-sm font-light leading-relaxed whitespace-pre-wrap"
                              style={{ color: 'rgba(255,255,255,0.6)' }}>
                              {d.output.slice(0, 800)}{d.output.length > 800 ? '···' : ''}
                            </p>
                          ) : (
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>No output recorded</p>
                          )}

                          {/* Validation */}
                          {d.validation && (
                            <div className="mt-3 pt-3 flex items-start gap-4"
                              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <ScoreDot score={d.validation.score} />
                              {d.validation.summary && (
                                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                  {d.validation.summary}
                                </p>
                              )}
                              {d.validation.issues.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {d.validation.issues.map((iss, i) => (
                                    <span key={i} className="text-xs px-2 py-0.5 rounded"
                                      style={{ background: 'rgba(255,107,107,0.06)', color: '#FF6B6B' }}>
                                      {iss}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Link to workflow */}
                          {ex.workflow && (
                            <div className="pt-2">
                              <Link href={`/workflows/${ex.workflow.id}`}
                                className="text-xs font-light transition-colors"
                                style={{ color: 'rgba(255,255,255,0.2)' }}>
                                View workflow →
                              </Link>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Page {currentPage} of {pages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              className="text-xs font-light px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'rgba(255,255,255,0.5)' }}>
              ← Previous
            </button>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
              className="text-xs font-light px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'rgba(255,255,255,0.5)' }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
