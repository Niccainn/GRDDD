'use client';

import { useState, useEffect, useCallback } from 'react';
import DataView from '@/components/DataView';
import type { EntityType, ViewType } from '@/lib/views';

const ENTITY_LABELS: Record<EntityType, string> = {
  tasks: 'Tasks',
  workflows: 'Workflows',
  systems: 'Systems',
  goals: 'Goals',
  executions: 'Executions',
};

const ENTITY_API: Record<EntityType, string> = {
  tasks: '/api/views?entity=tasks&limit=200',
  workflows: '/api/views?entity=workflows&limit=200',
  systems: '/api/views?entity=systems&limit=200',
  goals: '/api/views?entity=goals&limit=200',
  executions: '/api/views?entity=executions&limit=200',
};

const DEFAULT_VIEWS: Record<EntityType, ViewType> = {
  tasks: 'table',
  workflows: 'table',
  systems: 'gallery',
  goals: 'table',
  executions: 'table',
};

export default function ViewsPage() {
  const [entityType, setEntityType] = useState<EntityType>('tasks');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (entity: EntityType) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(ENTITY_API[entity]);
      if (!res.ok) throw new Error(`Failed to load ${entity}`);
      const json = await res.json();
      // Normalize: some endpoints return { data, total }, others return flat arrays
      if (Array.isArray(json)) {
        setData(json);
        setTotal(json.length);
      } else if (json.data) {
        setData(json.data);
        setTotal(json.total ?? json.data.length);
      } else if (json.tasks) {
        // tasks API returns { tasks, counts }
        setData(json.tasks);
        setTotal(json.tasks.length);
      } else {
        setData([]);
        setTotal(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(entityType);
  }, [entityType, fetchData]);

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">Views</h1>
          <p className="text-sm font-light" style={{ color: 'var(--text-2)' }}>
            Browse and organize any data with custom views
          </p>
        </div>
      </div>

      {/* Entity type selector */}
      <div className="flex items-center gap-1 mb-6 rounded-xl p-1 w-fit" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
        {(Object.keys(ENTITY_LABELS) as EntityType[]).map(et => {
          const active = entityType === et;
          return (
            <button
              key={et}
              onClick={() => setEntityType(et)}
              className="px-4 py-2 text-xs font-light rounded-lg transition-all"
              style={{
                background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
              }}
            >
              {ENTITY_LABELS[et]}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'transparent' }} />
          <span className="ml-3 text-sm font-light" style={{ color: 'var(--text-3)' }}>Loading {ENTITY_LABELS[entityType].toLowerCase()}...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm font-light mb-2" style={{ color: '#FF4D4D' }}>{error}</p>
          <button onClick={() => fetchData(entityType)} className="text-xs font-light px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.5)' }}>
            Retry
          </button>
        </div>
      )}

      {/* Data view */}
      {!loading && !error && (
        <DataView
          entityType={entityType}
          data={data}
          defaultView={DEFAULT_VIEWS[entityType]}
        />
      )}

      {/* Total */}
      {!loading && !error && total > 0 && (
        <div className="mt-4 text-right">
          <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            {total} total {ENTITY_LABELS[entityType].toLowerCase()}
          </span>
        </div>
      )}
    </div>
  );
}
