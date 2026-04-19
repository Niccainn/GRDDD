'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

type Config = {
  id: string;
  scopeType: string;
  scopeId: string;
  scopeLabel: string;
  level: number;
  totalActions: number;
  approvedActions: number;
  overriddenActions: number;
  approvalRate: number;
  recommendedLevel: number | null;
  recommendReason: string | null;
  environmentId: string;
};

const LEVELS = [
  { name: 'Observe', color: 'rgba(255,255,255,0.35)', desc: 'Nova watches, you decide' },
  { name: 'Suggest', color: '#6395ff', desc: 'Nova suggests, you approve' },
  { name: 'Act & Notify', color: '#C8F26B', desc: 'Nova acts, you\'re notified' },
  { name: 'Autonomous', color: '#a878ff', desc: 'Nova handles it' },
  { name: 'Self-Direct', color: '#F7C700', desc: 'Nova acts and adapts strategy' },
];

function trustColor(rate: number) {
  if (rate > 0.8) return '#C8F26B';
  if (rate > 0.5) return '#F7C700';
  return '#ff5c46';
}

export default function AutonomyConfig({
  environmentId,
  className,
}: {
  environmentId: string;
  className?: string;
}) {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const fetchConfigs = useCallback(() => {
    fetch(`/api/autonomy?environmentId=${environmentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setConfigs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [environmentId]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  function handleLevelChange(config: Config, newLevel: number) {
    // Optimistic update
    setConfigs((prev) =>
      prev.map((c) => (c.id === config.id ? { ...c, level: newLevel } : c))
    );

    // Debounced save
    if (debounceTimers.current[config.id]) {
      clearTimeout(debounceTimers.current[config.id]);
    }
    debounceTimers.current[config.id] = setTimeout(() => {
      fetch('/api/autonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeType: config.scopeType,
          scopeId: config.scopeId,
          scopeLabel: config.scopeLabel,
          level: newLevel,
          environmentId: config.environmentId,
        }),
      });
    }, 500);
  }

  function handleAcceptRecommendation(config: Config) {
    if (config.recommendedLevel === null) return;
    handleLevelChange(config, config.recommendedLevel);
    setConfigs((prev) =>
      prev.map((c) =>
        c.id === config.id
          ? { ...c, level: config.recommendedLevel!, recommendedLevel: null, recommendReason: null }
          : c
      )
    );
  }

  // Aggregate trust score
  const totalApproved = configs.reduce((s, c) => s + c.approvedActions, 0);
  const totalActions = configs.reduce((s, c) => s + c.totalActions, 0);
  const aggregateRate = totalActions > 0 ? totalApproved / totalActions : 0;
  const aggregatePercent = Math.round(aggregateRate * 100);

  if (loading) {
    return (
      <div className={className} style={{ padding: '2rem', color: 'var(--text-3)' }}>
        <div style={{ fontWeight: 300, letterSpacing: '0.02em' }}>Loading autonomy configs...</div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-2)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              margin: 0,
            }}
          >
            Nova Autonomy
          </h2>
        </div>
        <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 13, margin: 0 }}>
          Control how much Nova can do without asking
        </p>
      </div>

      {/* Trust Score */}
      {configs.length > 0 && (
        <div
          style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            borderRadius: 20,
            padding: '1.5rem 2rem',
            marginBottom: '1.5rem',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          {/* Circular indicator */}
          <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="32" cy="32" r="26"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="4"
              />
              <circle
                cx="32" cy="32" r="26"
                fill="none"
                stroke={trustColor(aggregateRate)}
                strokeWidth="4"
                strokeDasharray={`${aggregateRate * 163.36} 163.36`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.3s ease' }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 600,
                color: trustColor(aggregateRate),
                letterSpacing: '-0.02em',
              }}
            >
              {aggregatePercent}%
            </div>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 300, color: 'var(--text-1)', margin: 0, marginBottom: 4 }}>
              Nova Trust Score
            </p>
            <p style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-3)', margin: 0 }}>
              {totalApproved} approved of {totalActions} total actions across {configs.length} scopes
            </p>
          </div>
        </div>
      )}

      {/* Level Legend */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: '1.5rem',
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.04)',
          overflowX: 'auto',
        }}
      >
        {LEVELS.map((l, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '6px 8px',
              borderRadius: 8,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: l.color,
                margin: '0 auto 6px',
                boxShadow: `0 0 8px ${l.color}40`,
              }}
            />
            <div style={{ fontSize: 10, fontWeight: 500, color: l.color, marginBottom: 2, whiteSpace: 'nowrap' }}>
              {l.name}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 300, lineHeight: 1.3 }}>
              {l.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Per-scope configs */}
      {configs.length === 0 ? (
        <div
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            borderRadius: 16,
            border: '1px dashed var(--glass-border)',
          }}
        >
          <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 13 }}>
            No autonomy configs yet. Create workflows or systems to configure Nova&apos;s autonomy.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {configs.map((config) => {
            const levelInfo = LEVELS[config.level] ?? LEVELS[0];
            const hasRecommendation =
              config.recommendedLevel !== null &&
              config.recommendedLevel !== config.level;
            const ratePercent = Math.round(config.approvalRate * 100);
            const rateColor = trustColor(config.approvalRate);

            return (
              <div
                key={config.id}
                style={{
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 16,
                  padding: '1.25rem 1.5rem',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Top row: label + badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 300, color: 'var(--text-1)' }}>
                    {config.scopeLabel}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase' as const,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background:
                        config.scopeType === 'workflow'
                          ? 'rgba(99,149,255,0.1)'
                          : config.scopeType === 'system'
                          ? 'rgba(168,120,255,0.1)'
                          : 'rgba(255,255,255,0.06)',
                      color:
                        config.scopeType === 'workflow'
                          ? '#6395ff'
                          : config.scopeType === 'system'
                          ? '#a878ff'
                          : 'var(--text-3)',
                      border: `1px solid ${
                        config.scopeType === 'workflow'
                          ? 'rgba(99,149,255,0.2)'
                          : config.scopeType === 'system'
                          ? 'rgba(168,120,255,0.2)'
                          : 'rgba(255,255,255,0.1)'
                      }`,
                    }}
                  >
                    {config.scopeType}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 11,
                      fontWeight: 400,
                      color: levelInfo.color,
                    }}
                  >
                    {levelInfo.name}
                  </span>
                </div>

                {/* Slider */}
                <div style={{ marginBottom: 14 }}>
                  <style>{`
                    .autonomy-slider-${config.id.replace(/[^a-zA-Z0-9]/g, '')} {
                      -webkit-appearance: none;
                      appearance: none;
                      width: 100%;
                      height: 6px;
                      border-radius: 3px;
                      background: linear-gradient(
                        to right,
                        rgba(255,255,255,0.35) 0%,
                        #6395ff 25%,
                        #C8F26B 50%,
                        #a878ff 75%,
                        #F7C700 100%
                      );
                      outline: none;
                      opacity: 0.7;
                      transition: opacity 0.2s;
                      cursor: pointer;
                    }
                    .autonomy-slider-${config.id.replace(/[^a-zA-Z0-9]/g, '')}:hover {
                      opacity: 1;
                    }
                    .autonomy-slider-${config.id.replace(/[^a-zA-Z0-9]/g, '')}::-webkit-slider-thumb {
                      -webkit-appearance: none;
                      appearance: none;
                      width: 18px;
                      height: 18px;
                      border-radius: 50%;
                      background: rgba(20,20,25,0.9);
                      border: 2px solid ${levelInfo.color};
                      box-shadow: 0 0 12px ${levelInfo.color}60, 0 0 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1);
                      cursor: grab;
                      transition: box-shadow 0.2s, transform 0.1s;
                    }
                    .autonomy-slider-${config.id.replace(/[^a-zA-Z0-9]/g, '')}::-webkit-slider-thumb:active {
                      cursor: grabbing;
                      transform: scale(1.1);
                      box-shadow: 0 0 20px ${levelInfo.color}80, 0 0 6px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.15);
                    }
                    .autonomy-slider-${config.id.replace(/[^a-zA-Z0-9]/g, '')}::-moz-range-thumb {
                      width: 18px;
                      height: 18px;
                      border-radius: 50%;
                      background: rgba(20,20,25,0.9);
                      border: 2px solid ${levelInfo.color};
                      box-shadow: 0 0 12px ${levelInfo.color}60, 0 0 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1);
                      cursor: grab;
                    }
                  `}</style>
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={1}
                    value={config.level}
                    onChange={(e) => handleLevelChange(config, parseInt(e.target.value))}
                    className={`autonomy-slider-${config.id.replace(/[^a-zA-Z0-9]/g, '')}`}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    {LEVELS.map((l, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 8,
                          color: config.level === i ? l.color : 'rgba(255,255,255,0.15)',
                          fontWeight: config.level === i ? 500 : 300,
                          transition: 'color 0.2s',
                          width: '20%',
                          textAlign: 'center',
                        }}
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Trust meter */}
                {config.totalActions > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 300 }}>
                        Approval rate
                      </span>
                      <span style={{ fontSize: 11, color: rateColor, fontWeight: 500 }}>
                        {ratePercent}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 3,
                        borderRadius: 2,
                        background: 'rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${ratePercent}%`,
                          borderRadius: 2,
                          background: rateColor,
                          boxShadow: `0 0 8px ${rateColor}40`,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Stats row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: hasRecommendation ? 12 : 0 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 300 }}>
                    {config.totalActions} actions
                  </span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>|</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 300 }}>
                    {config.approvedActions} approved
                  </span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>|</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 300 }}>
                    {config.overriddenActions} overridden
                  </span>
                </div>

                {/* Recommendation */}
                {hasRecommendation && config.recommendedLevel !== null && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(247,199,0,0.06)',
                      border: '1px solid rgba(247,199,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 11, color: '#F7C700', fontWeight: 400 }}>
                        Nova recommends Level {config.recommendedLevel} ({LEVELS[config.recommendedLevel]?.name}):
                      </span>{' '}
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 300 }}>
                        {config.recommendReason}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAcceptRecommendation(config)}
                      style={{
                        padding: '4px 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(247,199,0,0.25)',
                        background: 'rgba(247,199,0,0.1)',
                        color: '#F7C700',
                        fontSize: 11,
                        fontWeight: 400,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                      }}
                    >
                      Accept
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
