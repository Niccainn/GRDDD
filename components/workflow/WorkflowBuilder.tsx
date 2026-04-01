'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeType = 'start' | 'end' | 'task' | 'ai' | 'decision' | 'trigger';

export type WFNode = {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  label: string;
  description?: string;
};

export type WFEdge = {
  id: string;
  source: string;
  sourcePort: 'out' | 'yes' | 'no';
  target: string;
  label?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 158;
const NODE_H = 52;
const DECISION_S = 72;

const NODE_META: Record<NodeType, { bg: string; border: string; text: string; accent: string }> = {
  start:    { bg: 'rgba(21,173,112,0.1)',    border: 'rgba(21,173,112,0.45)',   text: '#15AD70',              accent: '#15AD70'              },
  end:      { bg: 'rgba(255,107,107,0.1)',   border: 'rgba(255,107,107,0.45)',  text: '#FF6B6B',              accent: '#FF6B6B'              },
  task:     { bg: 'rgba(255,255,255,0.04)',  border: 'rgba(255,255,255,0.14)',  text: 'rgba(255,255,255,0.8)', accent: 'rgba(255,255,255,0.4)' },
  ai:       { bg: 'rgba(191,159,241,0.08)', border: 'rgba(191,159,241,0.35)', text: '#BF9FF1',              accent: '#BF9FF1'              },
  decision: { bg: 'rgba(247,199,0,0.08)',   border: 'rgba(247,199,0,0.38)',   text: '#F7C700',              accent: '#F7C700'              },
  trigger:  { bg: 'rgba(113,147,237,0.08)', border: 'rgba(113,147,237,0.35)', text: '#7193ED',              accent: '#7193ED'              },
};

const PALETTE: { type: NodeType; label: string; icon: string; hint: string }[] = [
  { type: 'task',     label: 'Task',     icon: '◻', hint: 'Manual or automated step' },
  { type: 'ai',       label: 'Nova AI',  icon: '⚡', hint: 'AI-powered processing'    },
  { type: 'decision', label: 'Decision', icon: '◇', hint: 'Branch on condition'       },
  { type: 'trigger',  label: 'Trigger',  icon: '⏱', hint: 'Scheduled or event-based' },
  { type: 'end',      label: 'End',      icon: '◉', hint: 'Terminal node'             },
];

// ─── Geometry ─────────────────────────────────────────────────────────────────

function outPort(node: WFNode, port: 'out' | 'yes' | 'no' = 'out'): { x: number; y: number } {
  if (node.type === 'decision') {
    const cx = node.x + DECISION_S / 2;
    const cy = node.y + DECISION_S / 2;
    if (port === 'yes') return { x: node.x + DECISION_S, y: cy };
    if (port === 'no')  return { x: cx, y: node.y + DECISION_S };
    return { x: node.x + DECISION_S, y: cy };
  }
  return { x: node.x + NODE_W, y: node.y + NODE_H / 2 };
}

function inPort(node: WFNode): { x: number; y: number } {
  if (node.type === 'decision') return { x: node.x, y: node.y + DECISION_S / 2 };
  return { x: node.x, y: node.y + NODE_H / 2 };
}

function bezier(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x;
  const cp = Math.max(50, Math.abs(dx) * 0.45);
  return `M${from.x},${from.y} C${from.x + cp},${from.y} ${to.x - cp},${to.y} ${to.x},${to.y}`;
}

// ─── ID generator ─────────────────────────────────────────────────────────────

let _uid = 1000;
const uid = () => `n${Date.now()}_${_uid++}`;

// ─── WorkflowBuilder ─────────────────────────────────────────────────────────

export default function WorkflowBuilder({
  workflow,
  onSave,
}: {
  workflow: {
    id: string;
    name: string;
    status: string;
    stages: string[];
    nodes?: string | null;
    edges?: string | null;
    systemName: string;
    environmentName: string;
  };
  onSave: (nodes: WFNode[], edges: WFEdge[]) => Promise<void>;
}) {
  // ─── Init from workflow data ──────────────────────────────────────────────

  const initState = useCallback((): { nodes: WFNode[]; edges: WFEdge[] } => {
    if (workflow.nodes) {
      try {
        const n = JSON.parse(workflow.nodes);
        const e = workflow.edges ? JSON.parse(workflow.edges) : [];
        if (Array.isArray(n) && n.length > 0) return { nodes: n, edges: e };
      } catch { /* fall through */ }
    }
    // Bootstrap from linear stages
    const stages = workflow.stages.filter(Boolean);
    if (!stages.length) {
      const s1 = uid(), s2 = uid();
      return {
        nodes: [
          { id: s1, type: 'start', x: 80,  y: 220, label: 'Start' },
          { id: s2, type: 'end',   x: 400, y: 220, label: 'End'   },
        ],
        edges: [{ id: uid(), source: s1, sourcePort: 'out', target: s2 }],
      };
    }
    const nodeList: WFNode[] = [
      { id: uid(), type: 'start', x: 80, y: 220, label: 'Start' },
    ];
    stages.forEach((s, i) => {
      nodeList.push({ id: uid(), type: 'task', x: 80 + (i + 1) * 210, y: 220, label: s });
    });
    nodeList.push({ id: uid(), type: 'end', x: 80 + (stages.length + 1) * 210, y: 220, label: 'End' });
    const edgeList: WFEdge[] = nodeList.slice(0, -1).map((n, i) => ({
      id: uid(), source: n.id, sourcePort: 'out' as const, target: nodeList[i + 1].id,
    }));
    return { nodes: nodeList, edges: edgeList };
  }, [workflow]);

  const [nodes, setNodes] = useState<WFNode[]>(() => initState().nodes);
  const [edges, setEdges] = useState<WFEdge[]>(() => initState().edges);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [pan, setPan] = useState({ x: 40, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [connectLine, setConnectLine] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);

  // Drag & connect via refs to avoid stale closures in global listeners
  const dragRef = useRef<{ id: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const connectRef = useRef<{ sourceId: string; sourcePort: 'out' | 'yes' | 'no' } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; px: number; py: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const panRef2 = useRef(pan);
  panRef2.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // ─── Global mouse/key events ───────────────────────────────────────────────

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragRef.current) {
        const dz = zoomRef.current;
        const dx = (e.clientX - dragRef.current.startX) / dz;
        const dy = (e.clientY - dragRef.current.startY) / dz;
        setNodes(prev => prev.map(n =>
          n.id === dragRef.current!.id
            ? { ...n, x: Math.max(0, dragRef.current!.nodeX + dx), y: Math.max(0, dragRef.current!.nodeY + dy) }
            : n
        ));
        return;
      }
      if (connectRef.current && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const cx = (e.clientX - rect.left - panRef2.current.x) / zoomRef.current;
        const cy = (e.clientY - rect.top  - panRef2.current.y) / zoomRef.current;
        const src = nodesRef.current.find(n => n.id === connectRef.current!.sourceId);
        if (src) {
          setConnectLine({ from: outPort(src, connectRef.current.sourcePort), to: { x: cx, y: cy } });
        }
        return;
      }
      if (panRef.current) {
        setPan({ x: panRef.current.px + (e.clientX - panRef.current.startX), y: panRef.current.py + (e.clientY - panRef.current.startY) });
      }
    }

    function onUp() {
      dragRef.current = null;
      connectRef.current = null;
      setConnectLine(null);
      panRef.current = null;
    }

    function onKey(e: KeyboardEvent) {
      if (editingId) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        if (nodesRef.current.find(n => n.id === selected)) {
          setNodes(prev => prev.filter(n => n.id !== selected));
          setEdges(prev => prev.filter(ed => ed.source !== selected && ed.target !== selected));
        } else {
          setEdges(prev => prev.filter(ed => ed.id !== selected));
        }
        setSelected(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, editingId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function onCanvasMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('canvas-bg') && target !== canvasRef.current) return;
    setSelected(null);
    panRef.current = { startX: e.clientX, startY: e.clientY, px: pan.x, py: pan.y };
  }

  function onNodeMouseDown(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (editingId) return;
    setSelected(id);
    const node = nodes.find(n => n.id === id)!;
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y };
  }

  function onPortMouseDown(e: React.MouseEvent, sourceId: string, sourcePort: 'out' | 'yes' | 'no') {
    e.stopPropagation();
    connectRef.current = { sourceId, sourcePort };
    const src = nodes.find(n => n.id === sourceId)!;
    const from = outPort(src, sourcePort);
    setConnectLine({ from, to: from });
  }

  function onPortMouseUp(e: React.MouseEvent, targetId: string) {
    e.stopPropagation();
    if (!connectRef.current) return;
    const { sourceId, sourcePort } = connectRef.current;
    if (sourceId !== targetId) {
      const dup = edges.some(ed => ed.source === sourceId && ed.sourcePort === sourcePort && ed.target === targetId);
      if (!dup) {
        setEdges(prev => [...prev, { id: uid(), source: sourceId, sourcePort, target: targetId }]);
      }
    }
    connectRef.current = null;
    setConnectLine(null);
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom(z => Math.max(0.25, Math.min(2, z * (e.deltaY > 0 ? 0.92 : 1.09))));
  }

  function addNode(type: NodeType) {
    const label = { start: 'Start', end: 'End', task: 'New Task', ai: 'Nova Step', decision: 'Decision?', trigger: 'Trigger' }[type];
    const cx = canvasRef.current ? canvasRef.current.offsetWidth / 2 : 400;
    const cy = canvasRef.current ? canvasRef.current.offsetHeight / 2 : 300;
    const x = (cx - pan.x) / zoom - NODE_W / 2;
    const y = (cy - pan.y) / zoom - NODE_H / 2;
    const id = uid();
    setNodes(prev => [...prev, { id, type, x, y, label }]);
    setSelected(id);
  }

  function startEdit(id: string, label: string, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(label);
  }

  function commitEdit() {
    if (!editingId) return;
    setNodes(prev => prev.map(n => n.id === editingId ? { ...n, label: editValue.trim() || n.label } : n));
    setEditingId(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(nodes, edges);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const selectedNode = nodes.find(n => n.id === selected);
  const selectedEdge = edges.find(e => e.id === selected);
  const SVG_SIZE = 3000;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: '#09090b', color: 'white', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{ height: 52, borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0d0d0f' }}>
        <Link href={`/workflows/${workflow.id}`}
          className="flex items-center gap-1.5 text-xs font-light transition-colors"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {workflow.name}
        </Link>
        <div className="w-px h-3.5" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {workflow.systemName} · {workflow.environmentName}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-md ml-1 ${workflow.status === 'ACTIVE' ? '' : ''}`}
          style={{
            background: workflow.status === 'ACTIVE' ? 'rgba(21,173,112,0.1)' : 'rgba(255,255,255,0.05)',
            color: workflow.status === 'ACTIVE' ? '#15AD70' : 'rgba(255,255,255,0.35)',
          }}>
          {workflow.status.toLowerCase()}
        </span>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs font-light tabular-nums" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {nodes.length} nodes · {edges.length} edges
          </span>
          <button onClick={() => { setZoom(1); setPan({ x: 40, y: 0 }); }}
            className="text-xs font-light px-2 py-1 rounded transition-colors"
            style={{ color: 'rgba(255,255,255,0.25)' }}>
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 text-xs font-light px-3.5 py-1.5 rounded-lg transition-all"
            style={{
              background: saved ? 'rgba(21,173,112,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${saved ? 'rgba(21,173,112,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: saved ? '#15AD70' : 'rgba(255,255,255,0.7)',
            }}>
            {saving ? '···' : saved ? '✓ Saved' : 'Save'}
            {!saving && !saved && <kbd className="text-xs" style={{ fontFamily: 'inherit', opacity: 0.4 }}>⌘S</kbd>}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left palette ── */}
        <div className="flex flex-col gap-1 p-3 flex-shrink-0"
          style={{ width: 162, borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0b0b0d' }}>
          <p className="text-xs px-2 py-1 mb-1 tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.2)' }}>NODES</p>
          {PALETTE.map(p => {
            const meta = NODE_META[p.type];
            return (
              <button key={p.type} onClick={() => addNode(p.type)}
                title={p.hint}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-light text-left transition-all hover:opacity-80 active:scale-95"
                style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.text }}>
                <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{p.icon}</span>
                {p.label}
              </button>
            );
          })}

          <div className="mt-auto pt-4 space-y-1.5 px-2">
            <p className="text-xs tracking-[0.1em] mb-2" style={{ color: 'rgba(255,255,255,0.15)' }}>SHORTCUTS</p>
            {[
              ['Drag', 'Move node'],
              ['Drag bg', 'Pan'],
              ['Scroll', 'Zoom'],
              ['Del', 'Delete'],
              ['Dbl-click', 'Edit label'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)' }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Canvas ── */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden canvas-bg select-none"
          style={{ cursor: panRef.current ? 'grabbing' : 'grab' }}
          onMouseDown={onCanvasMouseDown}
          onWheel={onWheel}
        >
          {/* Dot grid */}
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <defs>
              <pattern id="dotgrid" width={24 * zoom} height={24 * zoom} patternUnits="userSpaceOnUse"
                x={pan.x % (24 * zoom)} y={pan.y % (24 * zoom)}>
                <circle cx={24 * zoom} cy={24 * zoom} r={0.9} fill="rgba(255,255,255,0.055)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotgrid)" />
          </svg>

          {/* Transformed container */}
          <div style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'absolute',
            width: SVG_SIZE,
            height: SVG_SIZE,
          }}>

            {/* ── SVG edges ── */}
            <svg width={SVG_SIZE} height={SVG_SIZE}
              style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
              <defs>
                {(['dim', 'sel', 'yes', 'no'] as const).map(k => (
                  <marker key={k} id={`arr-${k}`} markerWidth={9} markerHeight={9} refX={8} refY={3} orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill={
                      k === 'sel' ? 'rgba(113,147,237,0.9)'  :
                      k === 'yes' ? 'rgba(21,173,112,0.6)'   :
                      k === 'no'  ? 'rgba(247,199,0,0.6)'    :
                      'rgba(255,255,255,0.25)'
                    } />
                  </marker>
                ))}
              </defs>

              {edges.map(edge => {
                const src = nodes.find(n => n.id === edge.source);
                const tgt = nodes.find(n => n.id === edge.target);
                if (!src || !tgt) return null;
                const from = outPort(src, edge.sourcePort);
                const to   = inPort(tgt);
                const isSel = selected === edge.id;
                const arrKey = isSel ? 'sel' : edge.sourcePort === 'yes' ? 'yes' : edge.sourcePort === 'no' ? 'no' : 'dim';
                const stroke = isSel ? 'rgba(113,147,237,0.9)' : edge.sourcePort === 'yes' ? 'rgba(21,173,112,0.5)' : edge.sourcePort === 'no' ? 'rgba(247,199,0,0.5)' : 'rgba(255,255,255,0.18)';
                const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 4 };
                return (
                  <g key={edge.id} style={{ pointerEvents: 'all', cursor: 'pointer' }}>
                    <path d={bezier(from, to)} fill="none" stroke="transparent" strokeWidth={14}
                      onClick={e => { e.stopPropagation(); setSelected(edge.id); }} />
                    <path d={bezier(from, to)} fill="none" stroke={stroke} strokeWidth={isSel ? 2 : 1.5}
                      markerEnd={`url(#arr-${arrKey})`} />
                    {edge.sourcePort !== 'out' && (
                      <text x={mid.x} y={mid.y} textAnchor="middle" fontSize={10}
                        fill={edge.sourcePort === 'yes' ? 'rgba(21,173,112,0.7)' : 'rgba(247,199,0,0.7)'}>
                        {edge.sourcePort}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Live connect line */}
              {connectLine && (
                <path d={bezier(connectLine.from, connectLine.to)}
                  fill="none" stroke="rgba(113,147,237,0.55)" strokeWidth={1.5} strokeDasharray="5 3" />
              )}
            </svg>

            {/* ── Nodes ── */}
            {nodes.map(node => {
              const meta = NODE_META[node.type];
              const isSel = selected === node.id;
              const isEditing = editingId === node.id;

              // ── Decision diamond ──
              if (node.type === 'decision') {
                const s = DECISION_S;
                const cx = s / 2, cy = s / 2;
                return (
                  <div key={node.id} style={{ position: 'absolute', left: node.x, top: node.y, width: s, height: s, userSelect: 'none' }}
                    onMouseDown={e => onNodeMouseDown(e, node.id)}
                    onDoubleClick={e => startEdit(node.id, node.label, e)}>
                    <svg width={s} height={s} style={{ position: 'absolute', inset: 0 }}>
                      <polygon
                        points={`${cx},3 ${s - 3},${cy} ${cx},${s - 3} 3,${cy}`}
                        fill={meta.bg}
                        stroke={isSel ? '#7193ED' : meta.border}
                        strokeWidth={isSel ? 2 : 1.2}
                      />
                    </svg>
                    {/* Label */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, padding: '0 10px' }}>
                      {isEditing ? (
                        <input value={editValue} onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); e.stopPropagation(); }}
                          autoFocus onClick={e => e.stopPropagation()}
                          style={{ width: '80%', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontSize: 11, color: meta.text, fontFamily: 'inherit' }} />
                      ) : (
                        <span style={{ fontSize: 11, color: meta.text, textAlign: 'center', lineHeight: 1.3 }}>{node.label}</span>
                      )}
                    </div>
                    {/* Input port — left */}
                    <div style={{ position: 'absolute', left: -7, top: s / 2 - 7, width: 14, height: 14, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.2)', cursor: 'crosshair', zIndex: 3 }}
                      onMouseUp={e => onPortMouseUp(e, node.id)} />
                    {/* Yes port — right */}
                    <div title="yes →"
                      style={{ position: 'absolute', right: -7, top: s / 2 - 7, width: 14, height: 14, borderRadius: '50%', background: 'rgba(21,173,112,0.25)', border: '1.5px solid rgba(21,173,112,0.7)', cursor: 'crosshair', zIndex: 3 }}
                      onMouseDown={e => onPortMouseDown(e, node.id, 'yes')}
                      onMouseUp={e => onPortMouseUp(e, node.id)} />
                    {/* No port — bottom */}
                    <div title="no ↓"
                      style={{ position: 'absolute', bottom: -7, left: s / 2 - 7, width: 14, height: 14, borderRadius: '50%', background: 'rgba(247,199,0,0.25)', border: '1.5px solid rgba(247,199,0,0.7)', cursor: 'crosshair', zIndex: 3 }}
                      onMouseDown={e => onPortMouseDown(e, node.id, 'no')}
                      onMouseUp={e => onPortMouseUp(e, node.id)} />
                  </div>
                );
              }

              // ── Standard node ──
              const isRound = node.type === 'start' || node.type === 'end';
              const icon: string | null =
                node.type === 'ai' ? '⚡' :
                node.type === 'trigger' ? '⏱' :
                node.type === 'start' ? '▶' :
                node.type === 'end' ? '■' : null;

              return (
                <div key={node.id}
                  style={{
                    position: 'absolute', left: node.x, top: node.y,
                    width: NODE_W, height: NODE_H,
                    borderRadius: isRound ? 999 : 10,
                    background: meta.bg,
                    border: `1px solid ${isSel ? '#7193ED' : meta.border}`,
                    boxShadow: isSel ? '0 0 0 3px rgba(113,147,237,0.18)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'move', userSelect: 'none',
                    zIndex: isSel ? 10 : 2,
                    transition: 'border-color 0.1s, box-shadow 0.1s',
                  }}
                  onMouseDown={e => onNodeMouseDown(e, node.id)}
                  onDoubleClick={e => startEdit(node.id, node.label, e)}>

                  {icon && (
                    <span style={{ fontSize: node.type === 'ai' ? 14 : 11, color: meta.accent, marginRight: 7, flexShrink: 0, lineHeight: 1 }}>
                      {icon}
                    </span>
                  )}

                  {isEditing ? (
                    <input value={editValue} onChange={e => setEditValue(e.target.value)}
                      onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); e.stopPropagation(); }}
                      autoFocus onClick={e => e.stopPropagation()}
                      style={{ background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontSize: 12, color: meta.text, fontFamily: 'inherit', width: '65%' }} />
                  ) : (
                    <span style={{ fontSize: 12, color: meta.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 105 }}>
                      {node.label}
                    </span>
                  )}

                  {/* Output port — right (not on 'end') */}
                  {node.type !== 'end' && (
                    <div style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', background: meta.bg, border: `1.5px solid ${meta.border}`, cursor: 'crosshair', zIndex: 3 }}
                      onMouseDown={e => onPortMouseDown(e, node.id, 'out')}
                      onMouseUp={e => onPortMouseUp(e, node.id)} />
                  )}
                  {/* Input port — left (not on 'start') */}
                  {node.type !== 'start' && (
                    <div style={{ position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.2)', cursor: 'crosshair', zIndex: 3 }}
                      onMouseUp={e => onPortMouseUp(e, node.id)} />
                  )}
                </div>
              );
            })}

          </div>{/* end transform container */}

          {/* Empty state hint */}
          {nodes.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.2)' }}>Add nodes from the left panel</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.1)' }}>Drag output ports to connect nodes</p>
            </div>
          )}
        </div>

        {/* ── Properties panel ── */}
        {(selectedNode || selectedEdge) && (
          <div className="flex-shrink-0 overflow-y-auto"
            style={{ width: 200, borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#0b0b0d', padding: 16 }}>

            {selectedNode && (() => {
              const meta = NODE_META[selectedNode.type];
              return (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs tracking-[0.1em] mb-3" style={{ color: 'rgba(255,255,255,0.2)' }}>NODE</p>

                    <div className="flex items-center gap-2 mb-4">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.accent, flexShrink: 0 }} />
                      <span className="text-xs font-light capitalize" style={{ color: meta.text }}>
                        {selectedNode.type === 'ai' ? 'Nova AI' : selectedNode.type}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs block mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Label</label>
                        <input
                          value={nodes.find(n => n.id === selectedNode.id)?.label ?? ''}
                          onChange={e => setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, label: e.target.value } : n))}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg focus:outline-none font-light"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        />
                      </div>
                      {selectedNode.type === 'decision' && (
                        <div className="rounded-lg p-2.5 space-y-1" style={{ background: 'rgba(247,199,0,0.06)', border: '1px solid rgba(247,199,0,0.15)' }}>
                          <p className="text-xs" style={{ color: 'rgba(247,199,0,0.7)' }}>Right port → <strong>yes</strong></p>
                          <p className="text-xs" style={{ color: 'rgba(247,199,0,0.7)' }}>Bottom port → <strong>no</strong></p>
                        </div>
                      )}
                      {selectedNode.type === 'ai' && (
                        <div className="rounded-lg p-2.5" style={{ background: 'rgba(191,159,241,0.06)', border: '1px solid rgba(191,159,241,0.15)' }}>
                          <p className="text-xs" style={{ color: 'rgba(191,159,241,0.7)' }}>Nova will process this step using your system context.</p>
                        </div>
                      )}
                      <div className="pt-1">
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                          pos {Math.round(selectedNode.x)}, {Math.round(selectedNode.y)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setNodes(prev => prev.filter(n => n.id !== selectedNode.id));
                      setEdges(prev => prev.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                      setSelected(null);
                    }}
                    className="w-full text-xs font-light py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(255,107,107,0.07)', border: '1px solid rgba(255,107,107,0.18)', color: '#FF6B6B' }}>
                    Delete node
                  </button>
                </div>
              );
            })()}

            {selectedEdge && (() => {
              const src = nodes.find(n => n.id === selectedEdge.source);
              const tgt = nodes.find(n => n.id === selectedEdge.target);
              return (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs tracking-[0.1em] mb-3" style={{ color: 'rgba(255,255,255,0.2)' }}>EDGE</p>
                    <div className="space-y-2 text-xs font-light">
                      <div>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>From</span>
                        <p className="mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{src?.label ?? '—'}</p>
                      </div>
                      <div>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>To</span>
                        <p className="mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{tgt?.label ?? '—'}</p>
                      </div>
                      {selectedEdge.sourcePort !== 'out' && (
                        <div>
                          <span style={{ color: 'rgba(255,255,255,0.3)' }}>Branch</span>
                          <p className="mt-0.5" style={{ color: selectedEdge.sourcePort === 'yes' ? '#15AD70' : '#F7C700' }}>
                            {selectedEdge.sourcePort}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { setEdges(prev => prev.filter(e => e.id !== selectedEdge.id)); setSelected(null); }}
                    className="w-full text-xs font-light py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(255,107,107,0.07)', border: '1px solid rgba(255,107,107,0.18)', color: '#FF6B6B' }}>
                    Delete edge
                  </button>
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
