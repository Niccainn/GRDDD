'use client';

import { useState, useEffect, useMemo } from 'react';
import ConsequenceMap from './ConsequenceMap';

type Entity = { id: string; name: string; type: string };

type ConsequenceLink = {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  relationship: string;
  impact: string;
};

export default function ConsequencePanel({
  environmentId,
  className,
}: {
  environmentId: string;
  className?: string;
}) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [links, setLinks] = useState<ConsequenceLink[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [impactFilter, setImpactFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all available entities (systems, workflows, goals) for the dropdown
    Promise.all([
      fetch(`/api/systems?environmentId=${environmentId}`).then(r => r.json()),
      fetch(`/api/workflows?environmentId=${environmentId}`).then(r => r.json()),
      fetch(`/api/goals?environmentId=${environmentId}`).then(r => r.json()),
    ]).then(([systems, workflows, goals]) => {
      const e: Entity[] = [];
      if (Array.isArray(systems)) {
        for (const s of systems) e.push({ id: s.id, name: s.name, type: 'system' });
      }
      if (Array.isArray(workflows)) {
        for (const w of workflows) e.push({ id: w.id, name: w.name, type: 'workflow' });
      }
      if (Array.isArray(goals)) {
        for (const g of goals) e.push({ id: g.id, name: g.title, type: 'goal' });
      }
      setEntities(e);
    });

    // Fetch all consequence links for stats
    fetch(`/api/consequences?environmentId=${environmentId}`)
      .then(r => r.json())
      .then(data => {
        setLinks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [environmentId]);

  const stats = useMemo(() => {
    const criticalPaths = links.filter(l => l.impact === 'critical').length;
    // Approximate average chain depth from link graph
    const sources = new Set(links.map(l => `${l.sourceType}:${l.sourceId}`));
    const targets = new Set(links.map(l => `${l.targetType}:${l.targetId}`));
    const roots = [...sources].filter(s => !targets.has(s));

    function traceDepth(key: string, visited: Set<string>): number {
      const [type, id] = key.split(':');
      const outgoing = links.filter(l => l.sourceType === type && l.sourceId === id);
      if (outgoing.length === 0) return 0;
      let maxD = 0;
      for (const l of outgoing) {
        const tKey = `${l.targetType}:${l.targetId}`;
        if (!visited.has(tKey)) {
          visited.add(tKey);
          maxD = Math.max(maxD, 1 + traceDepth(tKey, visited));
        }
      }
      return maxD;
    }

    const depths = roots.map(r => traceDepth(r, new Set([r])));
    const avgDepth = depths.length > 0 ? (depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(1) : '0';

    return {
      total: links.length,
      criticalPaths,
      avgDepth,
    };
  }, [links]);

  const filteredEnvironmentId = environmentId;

  return (
    <div className={className}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {/* Entity selector */}
        <div style={{ position: 'relative' }}>
          <select
            value={selectedEntity ? `${selectedEntity.type}:${selectedEntity.id}` : ''}
            onChange={(e) => {
              if (!e.target.value) {
                setSelectedEntity(null);
                return;
              }
              const [type, ...rest] = e.target.value.split(':');
              const id = rest.join(':');
              const entity = entities.find(en => en.type === type && en.id === id);
              setSelectedEntity(entity ?? null);
            }}
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '11px',
              fontWeight: 300,
              color: 'rgba(255,255,255,0.6)',
              appearance: 'none',
              WebkitAppearance: 'none',
              paddingRight: '28px',
              cursor: 'pointer',
              backdropFilter: 'blur(16px)',
              minWidth: '200px',
            }}
          >
            <option value="">What if... (select entity)</option>
            {entities.map(e => (
              <option key={`${e.type}:${e.id}`} value={`${e.type}:${e.id}`} style={{ background: '#1a1a1a' }}>
                {e.type === 'system' ? '\u25CB' : e.type === 'workflow' ? '\u25C7' : '\u25B3'} {e.name}
              </option>
            ))}
          </select>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <path d="M1 2.5l3 3 3-3" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Impact filter */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[null, 'critical', 'high'].map(level => (
            <button
              key={level ?? 'all'}
              onClick={() => setImpactFilter(level)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 300,
                border: `1px solid ${impactFilter === level ? 'rgba(255,255,255,0.2)' : 'transparent'}`,
                background: impactFilter === level ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: impactFilter === level ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {level ?? 'All impacts'}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px' }}>
          {[
            { label: 'Links', value: stats.total },
            { label: 'Critical', value: stats.criticalPaths },
            { label: 'Avg depth', value: stats.avgDepth },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: 200, color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '8px', fontWeight: 300, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: '16px',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          padding: '16px',
          minHeight: '200px',
        }}
      >
        <ConsequenceMap
          environmentId={filteredEnvironmentId}
          sourceType={selectedEntity?.type}
          sourceId={selectedEntity?.id}
        />
      </div>
    </div>
  );
}
