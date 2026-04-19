'use client';

import { useEffect, useState } from 'react';
import { useEnvironmentWorkspace } from '@/lib/contexts/environment-workspace';

type ActivityItem = {
  id: string;
  type: 'execution' | 'nova' | 'signal';
  title: string;
  description: string | null;
  timestamp: string;
  systemName: string | null;
  systemColor: string | null;
  status?: string;
  priority?: string;
};

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  execution: {
    color: '#15AD70',
    label: 'Execution',
    icon: (
      <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="6" stroke="#15AD70" strokeWidth="1.1" />
        <path d="M6 5l4 2.5-4 2.5V5z" fill="#15AD70" />
      </svg>
    ),
  },
  nova: {
    color: '#BF9FF1',
    label: 'Nova',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#BF9FF1" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  signal: {
    color: '#7193ED',
    label: 'Signal',
    icon: (
      <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
        <path d="M1.5 7.5H4L5.5 3.5L7.5 11.5L9.5 5.5L11 7.5H13.5" stroke="#7193ED" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

export default function EnvironmentActivity() {
  const { slug } = useEnvironmentWorkspace();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('');

  useEffect(() => {
    fetch(`/api/environments/${slug}/dashboard`)
      .then(r => r.json())
      .then(d => {
        const combined: ActivityItem[] = [];

        // Executions
        for (const ex of d.executions ?? []) {
          combined.push({
            id: ex.id,
            type: 'execution',
            title: ex.workflowName ? `${ex.workflowName} execution` : 'Execution',
            description: ex.input?.substring(0, 120) || null,
            timestamp: ex.createdAt,
            systemName: ex.systemName,
            systemColor: ex.systemColor,
            status: ex.status,
          });
        }

        // Nova logs
        for (const nl of d.novaLogs ?? []) {
          combined.push({
            id: nl.id,
            type: 'nova',
            title: nl.input?.substring(0, 80) || 'Nova query',
            description: nl.output?.substring(0, 120) || null,
            timestamp: nl.createdAt,
            systemName: nl.systemName,
            systemColor: nl.systemColor,
          });
        }

        // Signals
        for (const sig of d.signals ?? []) {
          combined.push({
            id: sig.id,
            type: 'signal',
            title: sig.title,
            description: sig.body?.substring(0, 120) || null,
            timestamp: sig.createdAt,
            systemName: sig.systemName,
            systemColor: null,
            priority: sig.priority,
          });
        }

        // Sort by timestamp descending
        combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setItems(combined);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const filtered = items.filter(i => !typeFilter || i.type === typeFilter);

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{items.length} events</span>
        <div className="flex-1" />
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
          {[
            { key: '', label: 'All' },
            { key: 'execution', label: 'Executions' },
            { key: 'nova', label: 'Nova' },
            { key: 'signal', label: 'Signals' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className="px-3 py-1.5 text-xs font-light transition-all"
              style={{
                background: typeFilter === f.key ? 'var(--glass-active)' : 'transparent',
                color: typeFilter === f.key ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-24 rounded-xl" style={{ border: '1px dashed var(--glass-border)' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No activity yet</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Activity from executions, Nova queries, and signals will appear here.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((item, idx) => {
            const meta = TYPE_META[item.type];
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 px-4 py-3 rounded-xl transition-all"
                style={{
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {/* Timeline dot */}
                <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}20` }}>
                  {meta.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className="text-xs font-light truncate" style={{ color: 'var(--text-1)' }}>
                      {item.title}
                    </p>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs truncate mb-1" style={{ color: 'var(--text-3)' }}>
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    {item.systemName && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.systemColor ?? 'var(--text-3)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{item.systemName}</span>
                      </span>
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: `${meta.color}10`, color: meta.color, border: `1px solid ${meta.color}20` }}>
                      {meta.label}
                    </span>
                    {item.status && (
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: item.status === 'SUCCESS' ? 'rgba(21,173,112,0.08)' : item.status === 'FAILED' ? 'rgba(255,87,87,0.08)' : 'var(--glass)',
                          color: item.status === 'SUCCESS' ? '#15AD70' : item.status === 'FAILED' ? '#FF5757' : 'var(--text-3)',
                          border: `1px solid ${item.status === 'SUCCESS' ? 'rgba(21,173,112,0.2)' : item.status === 'FAILED' ? 'rgba(255,87,87,0.2)' : 'var(--glass-border)'}`,
                        }}>
                        {item.status.toLowerCase()}
                      </span>
                    )}
                    {item.priority && (
                      <span className="text-xs" style={{
                        color: item.priority === 'URGENT' ? '#FF5757' : item.priority === 'HIGH' ? '#FF8C42' : 'var(--text-3)',
                      }}>
                        {item.priority.toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
