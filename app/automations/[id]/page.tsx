'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// ─── Types ──────────────────────────────────────────────────────

type NodeType = 'trigger' | 'action' | 'condition' | 'transform' | 'output';

interface AutomationNode {
  id: string;
  type: NodeType;
  subtype: string;
  label: string;
  x: number;
  y: number;
  config: Record<string, string>;
}

interface AutomationEdge {
  id: string;
  sourceId: string;
  sourcePort: string;
  targetId: string;
  targetPort: string;
}

interface AutomationData {
  id: string;
  name: string;
  description: string;
  trigger: string;
  triggerConfig: string;
  nodes: string;
  edges: string;
  isActive: boolean;
  environmentId: string;
  environmentName: string;
  runCount: number;
  lastRunAt: string | null;
}

// ─── Constants ──────────────────────────────────────────────────

const NODE_W = 160;
const NODE_H = 80;

const TYPE_COLORS: Record<NodeType, string> = {
  trigger:   '#C8F26B',
  action:    '#7193ED',
  condition: '#F7C700',
  transform: '#BF9FF1',
  output:    '#FF8C42',
};

const TYPE_ICONS: Record<NodeType, string> = {
  trigger:   'M13 10V3L4 14h7v7l9-11h-7z',
  action:    'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
  condition: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  transform: 'M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242',
  output:    'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
};

const NODE_SUBTYPES: Record<NodeType, { value: string; label: string }[]> = {
  trigger: [
    { value: 'schedule',  label: 'Schedule' },
    { value: 'webhook',   label: 'Webhook' },
    { value: 'event',     label: 'Event listener' },
    { value: 'manual',    label: 'Manual' },
  ],
  action: [
    { value: 'run_workflow',      label: 'Run workflow' },
    { value: 'send_notification', label: 'Send notification' },
    { value: 'update_record',     label: 'Update record' },
    { value: 'call_api',          label: 'Call API' },
    { value: 'run_nova',          label: 'Run Nova query' },
  ],
  condition: [
    { value: 'if_else',      label: 'If / else' },
    { value: 'filter',       label: 'Filter' },
    { value: 'check_status', label: 'Check status' },
  ],
  transform: [
    { value: 'map_data',   label: 'Map data' },
    { value: 'format',     label: 'Format' },
    { value: 'parse_json', label: 'Parse JSON' },
  ],
  output: [
    { value: 'send_email',   label: 'Send email' },
    { value: 'create_task',  label: 'Create task' },
    { value: 'update_goal',  label: 'Update goal' },
    { value: 'log',          label: 'Log' },
  ],
};

function nodeId() {
  return 'n_' + Math.random().toString(36).slice(2, 10);
}

function edgeId() {
  return 'e_' + Math.random().toString(36).slice(2, 10);
}

// ─── SVG edge path (cubic bezier) ───────────────────────────────

function edgePath(
  x1: number, y1: number,
  x2: number, y2: number
): string {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

// ─── Config panel field definitions ─────────────────────────────

function getConfigFields(type: NodeType, subtype: string): { key: string; label: string; kind: 'text' | 'textarea' | 'select'; options?: { value: string; label: string }[] }[] {
  if (type === 'trigger') {
    if (subtype === 'schedule') return [
      { key: 'cron', label: 'Cron expression', kind: 'text' },
      { key: 'timezone', label: 'Timezone', kind: 'text' },
    ];
    if (subtype === 'webhook') return [
      { key: 'path', label: 'Webhook path', kind: 'text' },
      { key: 'method', label: 'HTTP method', kind: 'select', options: [
        { value: 'POST', label: 'POST' }, { value: 'GET', label: 'GET' },
      ]},
    ];
    if (subtype === 'event') return [
      { key: 'eventName', label: 'Event name', kind: 'text' },
      { key: 'source', label: 'Source', kind: 'text' },
    ];
    return [];
  }
  if (type === 'action') {
    if (subtype === 'run_workflow') return [
      { key: 'workflowId', label: 'Workflow ID', kind: 'text' },
      { key: 'input', label: 'Input data', kind: 'textarea' },
    ];
    if (subtype === 'send_notification') return [
      { key: 'message', label: 'Message', kind: 'textarea' },
      { key: 'recipient', label: 'Recipient', kind: 'text' },
    ];
    if (subtype === 'update_record') return [
      { key: 'entity', label: 'Entity type', kind: 'text' },
      { key: 'entityId', label: 'Entity ID', kind: 'text' },
      { key: 'field', label: 'Field', kind: 'text' },
      { key: 'value', label: 'Value', kind: 'text' },
    ];
    if (subtype === 'call_api') return [
      { key: 'url', label: 'URL', kind: 'text' },
      { key: 'method', label: 'Method', kind: 'select', options: [
        { value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' }, { value: 'DELETE', label: 'DELETE' },
      ]},
      { key: 'body', label: 'Body', kind: 'textarea' },
    ];
    if (subtype === 'run_nova') return [
      { key: 'query', label: 'Nova query', kind: 'textarea' },
    ];
    return [];
  }
  if (type === 'condition') {
    if (subtype === 'if_else') return [
      { key: 'field', label: 'Field', kind: 'text' },
      { key: 'operator', label: 'Operator', kind: 'select', options: [
        { value: 'eq', label: 'equals' }, { value: 'neq', label: 'not equals' },
        { value: 'gt', label: 'greater than' }, { value: 'lt', label: 'less than' },
        { value: 'contains', label: 'contains' },
      ]},
      { key: 'value', label: 'Value', kind: 'text' },
    ];
    if (subtype === 'filter') return [
      { key: 'expression', label: 'Filter expression', kind: 'textarea' },
    ];
    if (subtype === 'check_status') return [
      { key: 'entity', label: 'Entity', kind: 'text' },
      { key: 'expectedStatus', label: 'Expected status', kind: 'text' },
    ];
    return [];
  }
  if (type === 'transform') {
    if (subtype === 'map_data') return [
      { key: 'mapping', label: 'Mapping (JSON)', kind: 'textarea' },
    ];
    if (subtype === 'format') return [
      { key: 'template', label: 'Template', kind: 'textarea' },
    ];
    if (subtype === 'parse_json') return [
      { key: 'path', label: 'JSON path', kind: 'text' },
    ];
    return [];
  }
  if (type === 'output') {
    if (subtype === 'send_email') return [
      { key: 'to', label: 'To', kind: 'text' },
      { key: 'subject', label: 'Subject', kind: 'text' },
      { key: 'body', label: 'Body', kind: 'textarea' },
    ];
    if (subtype === 'create_task') return [
      { key: 'title', label: 'Title', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'priority', label: 'Priority', kind: 'select', options: [
        { value: 'LOW', label: 'Low' }, { value: 'NORMAL', label: 'Normal' },
        { value: 'HIGH', label: 'High' }, { value: 'URGENT', label: 'Urgent' },
      ]},
    ];
    if (subtype === 'update_goal') return [
      { key: 'goalId', label: 'Goal ID', kind: 'text' },
      { key: 'progress', label: 'Progress (%)', kind: 'text' },
    ];
    if (subtype === 'log') return [
      { key: 'message', label: 'Log message', kind: 'textarea' },
    ];
    return [];
  }
  return [];
}

// ─── Component ──────────────────────────────────────────────────

export default function AutomationBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const automationId = params.id as string;

  const [data, setData] = useState<AutomationData | null>(null);
  const [nodes, setNodes] = useState<AutomationNode[]>([]);
  const [edges, setEdges] = useState<AutomationEdge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ nodeId: string; port: string } | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  // Drag state
  const dragRef = useRef<{
    nodeId: string;
    startX: number;
    startY: number;
    nodeStartX: number;
    nodeStartY: number;
  } | null>(null);

  // Canvas pan state
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const panRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load data ────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/automations/${automationId}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then((d: AutomationData) => {
        setData(d);
        setNameValue(d.name);
        try { setNodes(JSON.parse(d.nodes)); } catch { setNodes([]); }
        try { setEdges(JSON.parse(d.edges)); } catch { setEdges([]); }
        setLoaded(true);
      })
      .catch(() => router.push('/automations'));
  }, [automationId, router]);

  // ─── Auto-save (debounced) ────────────────────────────────

  const save = useCallback(async (n: AutomationNode[], e: AutomationEdge[], extra?: Record<string, unknown>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      await fetch(`/api/automations/${automationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: JSON.stringify(n),
          edges: JSON.stringify(e),
          ...extra,
        }),
      });
      setSaving(false);
    }, 600);
  }, [automationId]);

  // ─── Keyboard handler ─────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLSelectElement)) {
          e.preventDefault();
          deleteNode(selectedNodeId);
        }
      }
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setConnecting(null);
        setShowAddMenu(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // ─── Node operations ─────────────────────────────────────

  function addNode(type: NodeType, subtype: string, label: string) {
    const offset = nodes.length * 30;
    const newNode: AutomationNode = {
      id: nodeId(),
      type,
      subtype,
      label,
      x: 250 + offset + canvasOffset.x * -1,
      y: 150 + offset + canvasOffset.y * -1,
      config: {},
    };
    const next = [...nodes, newNode];
    setNodes(next);
    setSelectedNodeId(newNode.id);
    setShowAddMenu(false);
    save(next, edges);
  }

  function deleteNode(id: string) {
    const nextNodes = nodes.filter(n => n.id !== id);
    const nextEdges = edges.filter(e => e.sourceId !== id && e.targetId !== id);
    setNodes(nextNodes);
    setEdges(nextEdges);
    if (selectedNodeId === id) setSelectedNodeId(null);
    save(nextNodes, nextEdges);
  }

  function updateNodeConfig(id: string, key: string, value: string) {
    const next = nodes.map(n => n.id === id ? { ...n, config: { ...n.config, [key]: value } } : n);
    setNodes(next);
    save(next, edges);
  }

  // ─── Connection handling ──────────────────────────────────

  function handlePortClick(nodeId: string, port: 'in' | 'out' | 'out-true' | 'out-false') {
    if (!connecting) {
      if (port === 'in') return; // Must start from output
      setConnecting({ nodeId, port });
    } else {
      if (port !== 'in' || nodeId === connecting.nodeId) {
        setConnecting(null);
        return;
      }
      // Check for duplicate
      const exists = edges.some(e => e.sourceId === connecting.nodeId && e.targetId === nodeId);
      if (exists) { setConnecting(null); return; }

      const newEdge: AutomationEdge = {
        id: edgeId(),
        sourceId: connecting.nodeId,
        sourcePort: connecting.port,
        targetId: nodeId,
        targetPort: 'in',
      };
      const next = [...edges, newEdge];
      setEdges(next);
      setConnecting(null);
      save(nodes, next);
    }
  }

  // ─── Drag handling ────────────────────────────────────────

  function handleNodeMouseDown(e: React.MouseEvent, node: AutomationNode) {
    if ((e.target as HTMLElement).dataset.port) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      nodeStartX: node.x,
      nodeStartY: node.y,
    };
    setSelectedNodeId(node.id);
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      // Node drag
      if (dragRef.current) {
        const d = dragRef.current;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        setNodes(prev => prev.map(n =>
          n.id === d.nodeId ? { ...n, x: d.nodeStartX + dx, y: d.nodeStartY + dy } : n
        ));
        return;
      }
      // Canvas pan
      if (panRef.current) {
        const p = panRef.current;
        setCanvasOffset({
          x: p.offsetX + (e.clientX - p.startX),
          y: p.offsetY + (e.clientY - p.startY),
        });
      }
    }
    function onMouseUp() {
      if (dragRef.current) {
        const d = dragRef.current;
        dragRef.current = null;
        // Save final position
        setNodes(prev => {
          const updated = [...prev];
          save(updated, edges);
          return updated;
        });
      }
      if (panRef.current) {
        panRef.current = null;
      }
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  });

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setSelectedNodeId(null);
      setConnecting(null);
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        offsetX: canvasOffset.x,
        offsetY: canvasOffset.y,
      };
    }
  }

  // ─── Toggle active ────────────────────────────────────────

  async function toggleActive() {
    if (!data) return;
    const next = !data.isActive;
    setData({ ...data, isActive: next });
    await fetch(`/api/automations/${automationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: next }),
    });
  }

  // ─── Rename ───────────────────────────────────────────────

  function saveName() {
    setEditingName(false);
    if (!nameValue.trim() || !data) return;
    setData({ ...data, name: nameValue.trim() });
    save(nodes, edges, { name: nameValue.trim() });
  }

  // ─── Show toast ───────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  // ─── Get port positions ───────────────────────────────────

  function getPortPos(node: AutomationNode, port: string): { x: number; y: number } {
    if (port === 'in') return { x: node.x, y: node.y + NODE_H / 2 };
    if (port === 'out-true') return { x: node.x + NODE_W, y: node.y + NODE_H / 3 };
    if (port === 'out-false') return { x: node.x + NODE_W, y: node.y + (NODE_H * 2) / 3 };
    return { x: node.x + NODE_W, y: node.y + NODE_H / 2 };
  }

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border border-white/10 border-t-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
        style={{ background: 'var(--glass)', borderBottom: '1px solid var(--glass-border)' }}>
        <Link href="/automations" className="text-xs font-light transition-colors" style={{ color: 'var(--text-3)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="inline-block mr-1" style={{ verticalAlign: '-2px' }}>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Automations
        </Link>

        <div className="w-px h-4" style={{ background: 'var(--glass-border)' }} />

        {editingName ? (
          <input
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => { if (e.key === 'Enter') saveName(); }}
            className="text-sm font-light bg-transparent border-none focus:outline-none"
            style={{ color: 'white', width: '200px' }}
            autoFocus
          />
        ) : (
          <button onClick={() => setEditingName(true)} className="text-sm font-light transition-colors" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {data?.name ?? 'Untitled'}
          </button>
        )}

        <div className="flex-1" />

        {/* Active toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-light" style={{ color: data?.isActive ? '#C8F26B' : 'var(--text-3)' }}>
            {data?.isActive ? 'Active' : 'Inactive'}
          </span>
          <button onClick={toggleActive}
            className="w-8 h-4 rounded-full relative transition-all"
            style={{ background: data?.isActive ? 'rgba(200,242,107,0.3)' : 'rgba(255,255,255,0.1)' }}>
            <span className="absolute top-0.5 transition-all w-3 h-3 rounded-full"
              style={{ left: data?.isActive ? '18px' : '2px', background: data?.isActive ? '#C8F26B' : 'rgba(255,255,255,0.3)' }} />
          </button>
        </div>

        <div className="w-px h-4" style={{ background: 'var(--glass-border)' }} />

        {/* Add node button */}
        <div className="relative">
          <button onClick={() => setShowAddMenu(v => !v)}
            className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            + Add node
          </button>

          {showAddMenu && (
            <div className="absolute top-full right-0 mt-1 rounded-xl p-2 z-50 min-w-[260px]"
              style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(24px)' }}>
              {(Object.keys(NODE_SUBTYPES) as NodeType[]).map(type => (
                <div key={type} className="mb-2 last:mb-0">
                  <p className="text-[10px] font-light tracking-[0.1em] uppercase px-2 py-1"
                    style={{ color: TYPE_COLORS[type] }}>
                    {type}
                  </p>
                  {NODE_SUBTYPES[type].map(sub => (
                    <button key={sub.value}
                      onClick={() => addNode(type, sub.value, sub.label)}
                      className="w-full text-left text-xs font-light px-3 py-1.5 rounded-lg transition-all hover:bg-white/5"
                      style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {sub.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save indicator */}
        <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
          {saving ? 'Saving...' : 'Saved'}
        </span>

        {/* Run now */}
        <button onClick={() => showToast('Automation executed')}
          className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
          style={{ background: 'rgba(200,242,107,0.08)', border: '1px solid rgba(200,242,107,0.2)', color: '#C8F26B' }}>
          Run now
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden"
          style={{ background: '#08080C', cursor: connecting ? 'crosshair' : panRef.current ? 'grabbing' : 'grab' }}
          onMouseDown={handleCanvasMouseDown}
          onClick={(e) => {
            if (e.target === canvasRef.current) {
              setSelectedNodeId(null);
              setConnecting(null);
            }
          }}
        >
          {/* Grid pattern */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"
                patternTransform={`translate(${canvasOffset.x % 40},${canvasOffset.y % 40})`}>
                <circle cx="20" cy="20" r="0.5" fill="white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>

          {/* SVG layer for edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            <g transform={`translate(${canvasOffset.x},${canvasOffset.y})`}>
              {edges.map(edge => {
                const src = nodes.find(n => n.id === edge.sourceId);
                const tgt = nodes.find(n => n.id === edge.targetId);
                if (!src || !tgt) return null;
                const from = getPortPos(src, edge.sourcePort);
                const to = getPortPos(tgt, edge.targetPort);
                const srcColor = TYPE_COLORS[src.type] ?? '#fff';
                return (
                  <g key={edge.id}>
                    <path
                      d={edgePath(from.x, from.y, to.x, to.y)}
                      fill="none"
                      stroke={srcColor}
                      strokeWidth="1.5"
                      strokeOpacity="0.4"
                    />
                    {/* Click target (wider invisible path) */}
                    <path
                      d={edgePath(from.x, from.y, to.x, to.y)}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="12"
                      style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextEdges = edges.filter(x => x.id !== edge.id);
                        setEdges(nextEdges);
                        save(nodes, nextEdges);
                      }}
                    />
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Nodes */}
          <div className="absolute inset-0" style={{ zIndex: 2, transform: `translate(${canvasOffset.x}px,${canvasOffset.y}px)` }}>
            {nodes.map(node => {
              const color = TYPE_COLORS[node.type];
              const isSelected = selectedNodeId === node.id;
              const isCondition = node.type === 'condition';
              return (
                <div
                  key={node.id}
                  className="absolute select-none group/node"
                  style={{
                    left: node.x,
                    top: node.y,
                    width: NODE_W,
                    height: NODE_H,
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                >
                  {/* Node card */}
                  <div
                    className="w-full h-full rounded-xl overflow-hidden transition-all"
                    style={{
                      background: 'var(--glass)',
                      border: `1px solid ${isSelected ? color : 'var(--glass-border)'}`,
                      borderTopColor: color,
                      borderTopWidth: '2px',
                      backdropFilter: 'blur(16px)',
                      boxShadow: isSelected ? `0 0 20px ${color}20` : 'none',
                    }}
                  >
                    <div className="px-3 py-2.5 h-full flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d={TYPE_ICONS[node.type]}/>
                        </svg>
                        <span className="text-xs font-light truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {node.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                        {node.type}
                      </span>
                    </div>
                  </div>

                  {/* Input port (left) */}
                  {node.type !== 'trigger' && (
                    <div
                      data-port="in"
                      className="absolute w-3 h-3 rounded-full cursor-pointer transition-all hover:scale-150"
                      style={{
                        left: -6, top: NODE_H / 2 - 6,
                        background: connecting && connecting.nodeId !== node.id ? color : 'rgba(255,255,255,0.3)',
                        border: '2px solid #08080C',
                      }}
                      onClick={(e) => { e.stopPropagation(); handlePortClick(node.id, 'in'); }}
                    />
                  )}

                  {/* Output port(s) (right) */}
                  {isCondition ? (
                    <>
                      <div
                        data-port="out-true"
                        className="absolute w-3 h-3 rounded-full cursor-pointer transition-all hover:scale-150"
                        style={{
                          right: -6, top: NODE_H / 3 - 6,
                          background: connecting?.nodeId === node.id && connecting.port === 'out-true' ? '#C8F26B' : '#C8F26B',
                          border: '2px solid #08080C',
                        }}
                        onClick={(e) => { e.stopPropagation(); handlePortClick(node.id, 'out-true'); }}
                      />
                      <div
                        data-port="out-false"
                        className="absolute w-3 h-3 rounded-full cursor-pointer transition-all hover:scale-150"
                        style={{
                          right: -6, top: (NODE_H * 2) / 3 - 6,
                          background: connecting?.nodeId === node.id && connecting.port === 'out-false' ? '#FF6B6B' : '#FF6B6B',
                          border: '2px solid #08080C',
                        }}
                        onClick={(e) => { e.stopPropagation(); handlePortClick(node.id, 'out-false'); }}
                      />
                    </>
                  ) : (
                    <div
                      data-port="out"
                      className="absolute w-3 h-3 rounded-full cursor-pointer transition-all hover:scale-150"
                      style={{
                        right: -6, top: NODE_H / 2 - 6,
                        background: connecting?.nodeId === node.id ? color : 'rgba(255,255,255,0.3)',
                        border: '2px solid #08080C',
                      }}
                      onClick={(e) => { e.stopPropagation(); handlePortClick(node.id, 'out'); }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 3 }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2">
                  <circle cx="6" cy="6" r="2.5"/>
                  <circle cx="18" cy="12" r="2.5"/>
                  <circle cx="6" cy="18" r="2.5"/>
                  <path d="M8.5 6h4.5a2 2 0 012 2v2" strokeLinecap="round"/>
                  <path d="M8.5 18h4.5a2 2 0 002-2v-2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>Empty canvas</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Click "Add node" to start building</p>
            </div>
          )}

          {/* Connection mode indicator */}
          {connecting && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full z-50"
              style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
              <p className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
                Click an input port to connect, or press Escape to cancel
              </p>
            </div>
          )}
        </div>

        {/* Right config panel */}
        {selectedNode && (
          <div className="w-[300px] flex-shrink-0 overflow-y-auto"
            style={{ background: 'var(--glass)', borderLeft: '1px solid var(--glass-border)' }}>
            <div className="p-5">
              {/* Node header */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: `${TYPE_COLORS[selectedNode.type]}15`, border: `1px solid ${TYPE_COLORS[selectedNode.type]}30` }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={TYPE_COLORS[selectedNode.type]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={TYPE_ICONS[selectedNode.type]}/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-light truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{selectedNode.label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{selectedNode.type} / {selectedNode.subtype}</p>
                </div>
              </div>

              {/* Subtype selector */}
              <div className="mb-4">
                <label className="text-[10px] tracking-[0.08em] uppercase mb-1.5 block" style={{ color: 'var(--text-3)' }}>Type</label>
                <select
                  value={selectedNode.subtype}
                  onChange={e => {
                    const sub = NODE_SUBTYPES[selectedNode.type].find(s => s.value === e.target.value);
                    if (!sub) return;
                    const next = nodes.map(n => n.id === selectedNode.id ? { ...n, subtype: sub.value, label: sub.label } : n);
                    setNodes(next);
                    save(next, edges);
                  }}
                  className="w-full text-xs font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)' }}>
                  {NODE_SUBTYPES[selectedNode.type].map(s => (
                    <option key={s.value} value={s.value} style={{ background: '#111' }}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Config fields */}
              {getConfigFields(selectedNode.type, selectedNode.subtype).map(field => (
                <div key={field.key} className="mb-3">
                  <label className="text-[10px] tracking-[0.08em] uppercase mb-1.5 block" style={{ color: 'var(--text-3)' }}>
                    {field.label}
                  </label>
                  {field.kind === 'textarea' ? (
                    <textarea
                      value={selectedNode.config[field.key] ?? ''}
                      onChange={e => updateNodeConfig(selectedNode.id, field.key, e.target.value)}
                      rows={3}
                      className="w-full text-xs font-light px-3 py-2 rounded-lg focus:outline-none resize-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                    />
                  ) : field.kind === 'select' ? (
                    <select
                      value={selectedNode.config[field.key] ?? ''}
                      onChange={e => updateNodeConfig(selectedNode.id, field.key, e.target.value)}
                      className="w-full text-xs font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.7)' }}>
                      <option value="" style={{ background: '#111' }}>Select...</option>
                      {field.options?.map(o => (
                        <option key={o.value} value={o.value} style={{ background: '#111' }}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={selectedNode.config[field.key] ?? ''}
                      onChange={e => updateNodeConfig(selectedNode.id, field.key, e.target.value)}
                      className="w-full text-xs font-light px-3 py-2 rounded-lg focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                    />
                  )}
                </div>
              ))}

              {/* Delete button */}
              <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  className="w-full text-xs font-light py-2 rounded-lg transition-all"
                  style={{ background: 'rgba(255,100,100,0.06)', border: '1px solid rgba(255,100,100,0.15)', color: '#FF6B6B' }}>
                  Delete node
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl z-[100]"
          style={{ background: 'var(--glass-deep)', border: '1px solid rgba(200,242,107,0.3)', backdropFilter: 'blur(16px)' }}>
          <p className="text-xs font-light" style={{ color: '#C8F26B' }}>{toast}</p>
        </div>
      )}
    </div>
  );
}
