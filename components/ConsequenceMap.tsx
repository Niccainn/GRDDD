'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
  description: string | null;
  lagTime: string | null;
  confidence: number;
};

type ChainNode = {
  id: string;
  type: string;
  entityId: string;
  label: string;
  relationship: string;
  impact: string;
  lagTime: string | null;
  description: string | null;
  confidence: number;
  children: ChainNode[];
};

type ChainResponse = {
  source: { type: string; entityId: string; label: string };
  chain: ChainNode[];
  depth: number;
  totalNodes: number;
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  triggers: '#15AD70',
  blocks: '#FF5757',
  feeds_into: '#7193ED',
  degrades: '#F7C700',
  improves: '#15AD70',
  requires: 'rgba(255,255,255,0.3)',
};

const IMPACT_BORDER: Record<string, string> = {
  critical: 'rgba(255,87,87,0.6)',
  high: 'rgba(255,255,255,0.25)',
  medium: 'rgba(255,255,255,0.12)',
  low: 'rgba(255,255,255,0.06)',
};

const TYPE_ICONS: Record<string, { shape: string; color: string }> = {
  system: { shape: 'circle', color: '#7193ED' },
  workflow: { shape: 'diamond', color: '#15AD70' },
  workflow_stage: { shape: 'diamond', color: '#15AD70' },
  goal: { shape: 'flag', color: '#F7C700' },
  task: { shape: 'checkbox', color: 'rgba(255,255,255,0.5)' },
  metric: { shape: 'chart', color: '#BF9FF1' },
};

function TypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  const config = TYPE_ICONS[type] ?? TYPE_ICONS.metric;
  if (config.shape === 'circle') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="5" stroke={config.color} strokeWidth="1.2" fill="none" />
      </svg>
    );
  }
  if (config.shape === 'diamond') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14">
        <path d="M7 1L13 7L7 13L1 7Z" stroke={config.color} strokeWidth="1.2" fill="none" />
      </svg>
    );
  }
  if (config.shape === 'flag') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14">
        <path d="M3 2v10M3 2l8 3-8 3" stroke={config.color} strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      </svg>
    );
  }
  if (config.shape === 'checkbox') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14">
        <rect x="2" y="2" width="10" height="10" rx="2" stroke={config.color} strokeWidth="1.2" fill="none" />
        <path d="M4.5 7l2 2 3-4" stroke={config.color} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // chart
  return (
    <svg width={size} height={size} viewBox="0 0 14 14">
      <path d="M2 12V6M5.5 12V4M9 12V8M12.5 12V2" stroke={config.color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    critical: { bg: 'rgba(255,87,87,0.15)', text: '#FF5757' },
    high: { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.6)' },
    medium: { bg: 'rgba(255,255,255,0.04)', text: 'rgba(255,255,255,0.35)' },
    low: { bg: 'rgba(255,255,255,0.02)', text: 'rgba(255,255,255,0.2)' },
  };
  const c = colors[impact] ?? colors.medium;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        borderRadius: '6px',
        fontSize: '9px',
        fontWeight: 300,
        background: c.bg,
        color: c.text,
        letterSpacing: '0.04em',
      }}
    >
      {impact}
    </span>
  );
}

// ---- Node card ----
function NodeCard({
  label,
  type,
  impact,
  isSource,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
  delay,
}: {
  label: string;
  type: string;
  impact: string;
  isSource?: boolean;
  isHighlighted: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  delay: number;
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: 'var(--glass)',
        border: `1px solid ${isHighlighted ? IMPACT_BORDER.critical : (IMPACT_BORDER[impact] ?? IMPACT_BORDER.medium)}`,
        borderRadius: '14px',
        padding: '12px 16px',
        minWidth: '140px',
        maxWidth: '180px',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        cursor: 'default',
        transition: 'border-color 0.3s, box-shadow 0.3s, opacity 0.4s, transform 0.4s',
        boxShadow: isHighlighted ? '0 0 20px rgba(21,173,112,0.15)' : 'none',
        animation: `consequenceFadeIn 0.4s ease-out ${delay}ms both`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <TypeIcon type={type} />
        <span
          style={{
            fontSize: '9px',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {type.replace('_', ' ')}
        </span>
      </div>
      <p
        style={{
          fontSize: '12px',
          fontWeight: 300,
          color: isSource ? '#15AD70' : 'rgba(255,255,255,0.75)',
          lineHeight: '1.35',
          margin: '0 0 6px 0',
        }}
      >
        {label}
      </p>
      <ImpactBadge impact={impact} />
    </div>
  );
}

// ---- Full-map mode: flatten all links into a graph ----
function buildGraphFromLinks(links: ConsequenceLink[]) {
  const nodesMap = new Map<string, { key: string; type: string; label: string; impact: string }>();
  const edges: { from: string; to: string; relationship: string; lagTime: string | null }[] = [];

  for (const link of links) {
    const fromKey = `${link.sourceType}:${link.sourceId}`;
    const toKey = `${link.targetType}:${link.targetId}`;
    if (!nodesMap.has(fromKey)) {
      nodesMap.set(fromKey, { key: fromKey, type: link.sourceType, label: link.sourceLabel, impact: 'medium' });
    }
    if (!nodesMap.has(toKey)) {
      nodesMap.set(toKey, { key: toKey, type: link.targetType, label: link.targetLabel, impact: link.impact });
    }
    // Update impact to the highest seen
    const existing = nodesMap.get(toKey)!;
    if (impactRank(link.impact) > impactRank(existing.impact)) {
      existing.impact = link.impact;
    }
    edges.push({ from: fromKey, to: toKey, relationship: link.relationship, lagTime: link.lagTime });
  }

  return { nodes: Array.from(nodesMap.values()), edges };
}

function impactRank(impact: string): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[impact] ?? 1;
}

// Topological-ish layering for horizontal layout
function layerNodes(
  nodes: { key: string; type: string; label: string; impact: string }[],
  edges: { from: string; to: string; relationship: string; lagTime: string | null }[],
) {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    inDegree.set(n.key, 0);
    adj.set(n.key, []);
  }
  for (const e of edges) {
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    adj.get(e.from)?.push(e.to);
  }

  const layers: string[][] = [];
  let current = nodes.filter(n => (inDegree.get(n.key) ?? 0) === 0).map(n => n.key);
  const placed = new Set<string>();

  while (current.length > 0) {
    layers.push(current);
    current.forEach(k => placed.add(k));
    const next = new Set<string>();
    for (const k of current) {
      for (const t of (adj.get(k) ?? [])) {
        if (!placed.has(t)) next.add(t);
      }
    }
    current = Array.from(next);
    if (layers.length > 8) break; // safety
  }

  // Place any remaining nodes
  const remaining = nodes.filter(n => !placed.has(n.key)).map(n => n.key);
  if (remaining.length > 0) layers.push(remaining);

  return layers;
}

// ---- Chain mode rendering ----
function ChainTree({
  nodes,
  highlighted,
  setHighlighted,
  depth,
}: {
  nodes: ChainNode[];
  highlighted: Set<string>;
  setHighlighted: (ids: Set<string>) => void;
  depth: number;
}) {
  if (nodes.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {nodes.map((node) => {
        const nodeKey = `${node.type}:${node.entityId}`;
        const relColor = RELATIONSHIP_COLORS[node.relationship] ?? 'rgba(255,255,255,0.2)';

        function collectDescendants(n: ChainNode): string[] {
          const keys = [`${n.type}:${n.entityId}`];
          for (const c of n.children) keys.push(...collectDescendants(c));
          return keys;
        }

        return (
          <div key={node.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0' }}>
            {/* Connector */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, minWidth: '60px', paddingTop: '20px' }}>
              <svg width="60" height="24" style={{ overflow: 'visible' }}>
                <defs>
                  <marker id={`arrow-${node.id}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6" fill={relColor} />
                  </marker>
                </defs>
                <line x1="0" y1="12" x2="50" y2="12" stroke={relColor} strokeWidth="1.5" markerEnd={`url(#arrow-${node.id})`} />
              </svg>
              <span style={{ fontSize: '8px', fontWeight: 300, color: relColor, whiteSpace: 'nowrap', marginTop: '2px' }}>
                {node.relationship.replace('_', ' ')}
              </span>
              {node.lagTime && (
                <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.2)', marginTop: '1px' }}>
                  {node.lagTime}
                </span>
              )}
            </div>

            {/* Node + children */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0' }}>
                <NodeCard
                  label={node.label}
                  type={node.type}
                  impact={node.impact}
                  isHighlighted={highlighted.has(nodeKey)}
                  onMouseEnter={() => {
                    const desc = collectDescendants(node);
                    setHighlighted(new Set(desc));
                  }}
                  onMouseLeave={() => setHighlighted(new Set())}
                  delay={depth * 100}
                />
                {node.children.length > 0 && (
                  <ChainTree
                    nodes={node.children}
                    highlighted={highlighted}
                    setHighlighted={setHighlighted}
                    depth={depth + 1}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ConsequenceMap({
  environmentId,
  sourceType,
  sourceId,
  className,
}: {
  environmentId: string;
  sourceType?: string;
  sourceId?: string;
  className?: string;
}) {
  const [links, setLinks] = useState<ConsequenceLink[]>([]);
  const [chain, setChain] = useState<ChainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const isChainMode = !!(sourceType && sourceId);

  useEffect(() => {
    setLoading(true);
    if (isChainMode) {
      fetch(`/api/consequences/chain?environmentId=${environmentId}&sourceType=${sourceType}&sourceId=${sourceId}`)
        .then(r => r.json())
        .then(data => { setChain(data); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      fetch(`/api/consequences?environmentId=${environmentId}`)
        .then(r => r.json())
        .then(data => { setLinks(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [environmentId, sourceType, sourceId, isChainMode]);

  if (loading) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
        <span style={{ fontSize: '12px', fontWeight: 300, color: 'rgba(255,255,255,0.25)' }}>Loading consequence map...</span>
      </div>
    );
  }

  // Chain mode
  if (isChainMode && chain) {
    if (chain.chain.length === 0) {
      return (
        <div className={className} style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', fontWeight: 300, color: 'rgba(255,255,255,0.3)' }}>No downstream consequences found</p>
        </div>
      );
    }

    return (
      <div className={className} ref={containerRef} style={{ overflowX: 'auto', padding: '16px 0' }}>
        <style>{`
          @keyframes consequenceFadeIn {
            from { opacity: 0; transform: translateX(-12px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0', minWidth: 'max-content' }}>
          {/* Source node */}
          <NodeCard
            label={chain.source.label}
            type={chain.source.type}
            impact="high"
            isSource
            isHighlighted={false}
            onMouseEnter={() => {}}
            onMouseLeave={() => {}}
            delay={0}
          />
          <ChainTree
            nodes={chain.chain}
            highlighted={highlighted}
            setHighlighted={setHighlighted}
            depth={1}
          />
        </div>
      </div>
    );
  }

  // Full map mode
  if (links.length === 0) {
    return (
      <div className={className} style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', fontWeight: 300, color: 'rgba(255,255,255,0.3)' }}>No consequence links yet</p>
      </div>
    );
  }

  const { nodes, edges } = buildGraphFromLinks(links);
  const layers = layerNodes(nodes, edges);

  // Position nodes in columns
  const COL_WIDTH = 220;
  const ROW_HEIGHT = 90;
  const nodePositions = new Map<string, { x: number; y: number }>();

  layers.forEach((layer, col) => {
    layer.forEach((key, row) => {
      const yOffset = (layers.reduce((max, l) => Math.max(max, l.length), 0) - layer.length) * ROW_HEIGHT / 2;
      nodePositions.set(key, { x: col * COL_WIDTH, y: row * ROW_HEIGHT + yOffset });
    });
  });

  const totalWidth = layers.length * COL_WIDTH;
  const maxRows = layers.reduce((max, l) => Math.max(max, l.length), 0);
  const totalHeight = maxRows * ROW_HEIGHT;

  function collectDownstream(key: string, edgeList: typeof edges): Set<string> {
    const result = new Set<string>();
    const queue = [key];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const e of edgeList) {
        if (e.from === current && !result.has(e.to)) {
          result.add(e.to);
          queue.push(e.to);
        }
      }
    }
    return result;
  }

  return (
    <div className={className} ref={containerRef} style={{ overflowX: 'auto', padding: '16px 0' }}>
      <style>{`
        @keyframes consequenceFadeIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div style={{ position: 'relative', minWidth: `${totalWidth + 180}px`, height: `${totalHeight + 40}px` }}>
        {/* SVG edges */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox={`0 0 ${totalWidth + 180} ${totalHeight + 40}`}
        >
          <defs>
            {edges.map((e, i) => (
              <marker key={`m-${i}`} id={`map-arrow-${i}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill={RELATIONSHIP_COLORS[e.relationship] ?? 'rgba(255,255,255,0.2)'} />
              </marker>
            ))}
          </defs>
          {edges.map((e, i) => {
            const from = nodePositions.get(e.from);
            const to = nodePositions.get(e.to);
            if (!from || !to) return null;
            const x1 = from.x + 160;
            const y1 = from.y + 35;
            const x2 = to.x;
            const y2 = to.y + 35;
            const midX = (x1 + x2) / 2;
            const relColor = RELATIONSHIP_COLORS[e.relationship] ?? 'rgba(255,255,255,0.2)';
            const isHl = highlighted.has(e.from) || highlighted.has(e.to);
            return (
              <g key={i}>
                <path
                  d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                  stroke={relColor}
                  strokeWidth={isHl ? 2 : 1}
                  strokeOpacity={isHl ? 1 : 0.5}
                  fill="none"
                  markerEnd={`url(#map-arrow-${i})`}
                />
                {e.lagTime && (
                  <text x={midX} y={(y1 + y2) / 2 - 6} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8" fontWeight="300">
                    {e.lagTime}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Node cards */}
        {nodes.map((node, i) => {
          const pos = nodePositions.get(node.key);
          if (!pos) return null;
          const col = layers.findIndex(l => l.includes(node.key));
          const isRoot = col === 0;
          return (
            <div key={node.key} style={{ position: 'absolute', left: pos.x, top: pos.y }}>
              <NodeCard
                label={node.label}
                type={node.type}
                impact={node.impact}
                isSource={isRoot}
                isHighlighted={highlighted.has(node.key)}
                onMouseEnter={() => {
                  const downstream = collectDownstream(node.key, edges);
                  downstream.add(node.key);
                  setHighlighted(downstream);
                }}
                onMouseLeave={() => setHighlighted(new Set())}
                delay={col * 100}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
