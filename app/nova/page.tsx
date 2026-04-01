'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

type LogEntry = {
  id: string;
  systemId: string | null;
  systemName: string;
  systemColor: string | null;
  query: string;
  response: string;
  tokens: number | null;
  createdAt: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function stripMarkdown(text: string) {
  return text.replace(/[#*`_~]/g, '').replace(/\n+/g, ' ').trim();
}

export default function NovaLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filtered, setFiltered] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/nova/logs?limit=100')
      .then(r => r.json())
      .then(data => {
        setLogs(data);
        setFiltered(data);
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    let results = logs;
    if (selectedSystem) results = results.filter(l => l.systemId === selectedSystem);
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(l =>
        l.query.toLowerCase().includes(q) ||
        l.response.toLowerCase().includes(q) ||
        l.systemName.toLowerCase().includes(q)
      );
    }
    setFiltered(results);
  }, [search, selectedSystem, logs]);

  // Unique systems
  const systems = Array.from(
    new Map(logs.filter(l => l.systemId).map(l => [l.systemId, { id: l.systemId!, name: l.systemName, color: l.systemColor }])).values()
  );

  const totalTokens = filtered.reduce((sum, l) => sum + (l.tokens ?? 0), 0);

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #BF9FF1, #7193ED)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-extralight tracking-tight">Nova</h1>
          </div>
          <p className="text-xs ml-10" style={{ color: 'var(--text-tertiary)' }}>
            {loaded ? `${filtered.length} interaction${filtered.length !== 1 ? 's' : ''}${totalTokens > 0 ? ` · ${totalTokens.toLocaleString()} tokens` : ''}` : 'Loading···'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="5" cy="5" r="3.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2"/>
            <path d="M8 8l2.5 2.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search queries and responses···"
            className="w-full text-sm font-light pl-8 pr-4 py-2 rounded-lg focus:outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
          />
        </div>

        {/* System filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedSystem('')}
            className="text-xs font-light px-3 py-1.5 rounded-full flex-shrink-0 transition-all"
            style={{
              background: !selectedSystem ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${!selectedSystem ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`,
              color: !selectedSystem ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
            }}>
            All systems
          </button>
          {systems.map(s => (
            <button key={s.id}
              onClick={() => setSelectedSystem(s.id === selectedSystem ? '' : s.id)}
              className="text-xs font-light px-3 py-1.5 rounded-full flex-shrink-0 transition-all flex items-center gap-1.5"
              style={{
                background: selectedSystem === s.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedSystem === s.id ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`,
                color: selectedSystem === s.id ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
              }}>
              {s.color && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />}
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Log entries */}
      {!loaded ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl"
          style={{ border: '1px dashed var(--border)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(191,159,241,0.1)', border: '1px solid rgba(191,159,241,0.15)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BF9FF1" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-secondary)' }}>
            {search || selectedSystem ? 'No matches' : 'No Nova interactions yet'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {search || selectedSystem ? 'Try a different filter' : 'Open a system and ask Nova something'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => (
            <div key={log.id}
              className="rounded-xl overflow-hidden transition-all cursor-pointer"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
              {/* Row */}
              <div className="px-5 py-4">
                <div className="flex items-start gap-4">
                  {/* System dot + name */}
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5 min-w-[110px]">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: log.systemColor ?? 'rgba(255,255,255,0.2)' }} />
                    {log.systemId ? (
                      <Link href={`/systems/${log.systemId}`}
                        onClick={e => e.stopPropagation()}
                        className="text-xs font-light truncate hover:text-white/60 transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}>
                        {log.systemName}
                      </Link>
                    ) : (
                      <span className="text-xs font-light" style={{ color: 'var(--text-tertiary)' }}>Global</span>
                    )}
                  </div>

                  {/* Query */}
                  <p className="flex-1 text-sm font-light italic truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    "{log.query}"
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {log.tokens && (
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>
                        {log.tokens.toLocaleString()} tk
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(log.createdAt)}</span>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                      className="transition-transform flex-shrink-0"
                      style={{ transform: expanded === log.id ? 'rotate(180deg)' : 'rotate(0deg)', color: 'rgba(255,255,255,0.2)' }}>
                      <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {/* Response preview (collapsed) */}
                {expanded !== log.id && log.response && (
                  <p className="text-xs mt-2 ml-[126px] line-clamp-2 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                    {stripMarkdown(log.response).slice(0, 220)}
                  </p>
                )}
              </div>

              {/* Expanded response */}
              {expanded === log.id && (
                <div className="px-5 pb-4 pt-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="ml-[126px]">
                    <p className="text-xs mb-2 mt-3" style={{ color: 'var(--text-tertiary)' }}>Response</p>
                    <div className="text-sm font-light leading-relaxed whitespace-pre-wrap"
                      style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {log.response || <span style={{ color: 'var(--text-tertiary)' }}>No response recorded</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      {log.tokens && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>
                          {log.tokens.toLocaleString()} tokens
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
