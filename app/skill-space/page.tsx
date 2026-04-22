'use client';

/**
 * /skill-space — the combinatorial skill surface.
 *
 * Every Nova step is a tuple (Location, Action, Interaction,
 * Execution). This page makes that surface legible:
 *   - shows every skill Nova has
 *   - labels the four dimensions on each
 *   - flags which skills are connected / planned / unavailable
 *   - surfaces "connect X to unlock N more combinations"
 *
 * It's the map of Nova's capability right now. New integrations
 * expand it; deeper skills deepen it.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Cell = {
  location: string;
  action: string;
  title: string;
  description: string;
  status: 'available' | 'partial' | 'planned';
  requiresApproval: boolean;
  connected: boolean;
};

type Space = {
  cells: Cell[];
  summary: {
    locationsTotal: number;
    locationsConnected: number;
    cellsTotal: number;
    availableCount: number;
    plannedCount: number;
  };
};

const STATUS_META: Record<Cell['status'], { color: string; bg: string; border: string; label: string }> = {
  available: { color: '#C8F26B', bg: 'rgba(200,242,107,0.08)', border: 'rgba(200,242,107,0.22)', label: 'Available' },
  partial: { color: '#F5D76E', bg: 'rgba(245,215,110,0.08)', border: 'rgba(245,215,110,0.22)', label: 'Partial' },
  planned: { color: '#7193ED', bg: 'rgba(113,147,237,0.08)', border: 'rgba(113,147,237,0.22)', label: 'Planned' },
};

export default function SkillSpacePage() {
  const [data, setData] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlyConnected, setOnlyConnected] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (onlyConnected) params.set('connected', '1');
    fetch(`/api/skills/space?${params.toString()}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [onlyConnected]);

  const locations = data ? Array.from(new Set(data.cells.map(c => c.location))).sort() : [];
  const filtered = data?.cells.filter(c => !locationFilter || c.location === locationFilter) ?? [];

  return (
    <div className="px-4 md:px-10 py-8 md:py-12 max-w-5xl mx-auto">
      <p className="text-[10px] tracking-[0.18em] uppercase font-light mb-2" style={{ color: 'var(--text-3)' }}>
        Skill space
      </p>
      <h1
        className="text-2xl md:text-3xl font-extralight tracking-tight mb-2"
        style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}
      >
        What Nova can do, right now
      </h1>
      <p className="text-sm font-light mb-8 max-w-2xl" style={{ color: 'var(--text-3)' }}>
        Every step in a project is a combination of four dimensions: <span style={{ color: 'var(--text-2)' }}>Location</span> (where), <span style={{ color: 'var(--text-2)' }}>Action</span> (what), <span style={{ color: 'var(--text-2)' }}>Interaction</span> (the human pattern), and <span style={{ color: 'var(--text-2)' }}>Execution</span> (how it runs). Connecting a tool unlocks every combination it supports. This is the map.
      </p>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <SummaryCard label="Locations connected" value={`${data.summary.locationsConnected} / ${data.summary.locationsTotal}`} />
          <SummaryCard label="Skills available" value={`${data.summary.availableCount}`} />
          <SummaryCard label="Planned" value={`${data.summary.plannedCount}`} />
          <SummaryCard label="Total skills" value={`${data.summary.cellsTotal}`} />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button
          onClick={() => setOnlyConnected(v => !v)}
          className="text-xs font-light px-3 py-1.5 rounded-full"
          style={{
            background: onlyConnected ? 'rgba(200,242,107,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${onlyConnected ? 'rgba(200,242,107,0.25)' : 'rgba(255,255,255,0.08)'}`,
            color: onlyConnected ? '#C8F26B' : 'var(--text-2)',
          }}
        >
          {onlyConnected ? 'Showing connected only' : 'Show connected only'}
        </button>
        <select
          value={locationFilter}
          onChange={e => setLocationFilter(e.target.value)}
          className="text-xs font-light px-3 py-1.5 rounded-full focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-2)',
          }}
        >
          <option value="">All locations</option>
          {locations.map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
            No skills match the filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c, i) => {
            const meta = STATUS_META[c.status];
            return (
              <div
                key={`${c.location}.${c.action}.${i}`}
                className="rounded-xl p-4"
                style={{
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                  opacity: c.connected ? 1 : 0.65,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Badge label="Loc" value={c.location} color="#7193ED" />
                    <Badge label="Act" value={c.action} color="#C8F26B" />
                  </div>
                  <span
                    className="text-[10px] font-light tracking-wider uppercase px-2 py-0.5 rounded-full"
                    style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>{c.title}</p>
                <p className="text-[11px] font-light leading-snug" style={{ color: 'var(--text-3)' }}>
                  {c.description}
                </p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {c.requiresApproval && (
                    <span
                      className="text-[10px] font-light tracking-wider uppercase px-2 py-0.5 rounded-full"
                      style={{
                        color: '#F5D76E',
                        background: 'rgba(245,215,110,0.06)',
                        border: '1px solid rgba(245,215,110,0.18)',
                      }}
                    >
                      HITL gate by default
                    </span>
                  )}
                  {!c.connected && (
                    <Link
                      href="/integrations"
                      className="text-[10px] font-light tracking-wider uppercase px-2 py-0.5 rounded-full"
                      style={{
                        color: '#BF9FF1',
                        background: 'rgba(191,159,241,0.06)',
                        border: '1px solid rgba(191,159,241,0.2)',
                      }}
                    >
                      Connect {c.location} to unlock →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] font-light mt-10" style={{ color: 'var(--text-3)' }}>
        The skill space grows when an integration lands or when a new Action is added to the taxonomy. Nova's planner picks a point in this space for every step of every project.
      </p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
    >
      <p className="text-[10px] tracking-[0.16em] uppercase font-light mb-1" style={{ color: 'var(--text-3)' }}>
        {label}
      </p>
      <p className="text-xl font-extralight" style={{ color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
        {value}
      </p>
    </div>
  );
}

function Badge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-light px-2 py-0.5 rounded-full"
      style={{
        background: `${color}0e`,
        border: `1px solid ${color}22`,
        color: 'var(--text-3)',
      }}
    >
      <span style={{ color, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      <span style={{ color: 'var(--text-2)' }}>{value}</span>
    </span>
  );
}
