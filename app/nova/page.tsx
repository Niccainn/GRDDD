'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import NovaSecondBrainPanel from '@/components/NovaSecondBrainPanel';

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: '#68D0CA', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function MD({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      elements.push(<p key={i} className="text-xs font-medium mt-4 mb-1.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{line.slice(3)}</p>);
    } else if (line.startsWith('# ')) {
      elements.push(<p key={i} className="text-sm font-light mt-4 mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>{line.slice(2)}</p>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(
        <div key={i} className="flex gap-2 my-0.5 ml-1">
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="my-0.5 leading-relaxed">{renderInline(line)}</p>);
    }
    i++;
  }
  return <div className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.75)' }}>{elements}</div>;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ToolCall = { name: string; label: string; status: 'running' | 'done'; summary?: string };
type ChatMessage =
  | { role: 'user'; content: string }
  | { role: 'nova'; content: string; toolCalls?: ToolCall[]; streaming?: boolean; tokens?: number };

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

// ─── Suggestion chips ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Which systems need attention?',
  'Show me a full overview',
  'Where are the bottlenecks?',
  'What workflows are stalled?',
  'Summarise org health',
  'What ran recently?',
];

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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NovaPage() {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Second Brain panel
  const [brainOpen, setBrainOpen] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logsLoaded, setLogsLoaded] = useState(false);

  // Load logs on mount
  useEffect(() => {
    fetch('/api/nova/logs?limit=60')
      .then(r => r.json())
      .then(data => { setLogs(data); setLogsLoaded(true); });
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (selectedSystem && l.systemId !== selectedSystem) return false;
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      return l.query.toLowerCase().includes(q) || l.response.toLowerCase().includes(q);
    }
    return true;
  });

  const systems = Array.from(
    new Map(logs.filter(l => l.systemId).map(l => [l.systemId, { id: l.systemId!, name: l.systemName, color: l.systemColor }])).values()
  );

  const totalTokens = messages.reduce((sum, m) => sum + ((m.role === 'nova' && m.tokens) ? m.tokens : 0), 0);

  function handleEvent(event: { type: string; [key: string]: unknown }) {
    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role !== 'nova') return prev;

      switch (event.type) {
        case 'tool_start':
          return [...updated.slice(0, -1), {
            ...last,
            toolCalls: [...(last.toolCalls ?? []), { name: event.name as string, label: event.label as string, status: 'running' as const }],
          }];
        case 'tool_done':
          return [...updated.slice(0, -1), {
            ...last,
            toolCalls: (last.toolCalls ?? []).map(tc =>
              tc.name === (event.name as string) && tc.status === 'running'
                ? { ...tc, status: 'done' as const, summary: event.summary as string }
                : tc
            ),
          }];
        case 'text':
          return [...updated.slice(0, -1), { ...last, content: last.content + (event.text as string) }];
        case 'done':
          return [...updated.slice(0, -1), { ...last, streaming: false, tokens: event.tokens as number }];
        case 'error':
          setError(event.message as string);
          return updated;
        default:
          return prev;
      }
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const query = input.trim();
    setInput('');
    setError('');
    setStreaming(true);

    setMessages(prev => [
      ...prev,
      { role: 'user', content: query },
      { role: 'nova', content: '', toolCalls: [], streaming: true },
    ]);

    try {
      const res = await fetch('/api/nova/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Nova failed');
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try { handleEvent(JSON.parse(line.slice(6))); } catch { /* skip */ }
        }
      }
    } catch {
      setError('Connection error — check your API key');
    } finally {
      setStreaming(false);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'nova') updated[updated.length - 1] = { ...last, streaming: false };
        return updated;
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ maxWidth: '100%' }}>
      <div className="px-4 md:px-10 pt-6 md:pt-10 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #BF9FF1 0%, #7193ED 100%)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-extralight tracking-tight">Nova</h1>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                AI operations engine · global mode
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalTokens > 0 && (
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {totalTokens.toLocaleString()} tokens this session
              </span>
            )}
            <button
              onClick={() => setBrainOpen(true)}
              title="Nova Second Brain"
              className="flex items-center justify-center transition-all"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'rgba(191,159,241,0.08)',
                border: '1px solid rgba(191,159,241,0.15)',
                cursor: 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#BF9FF1" strokeWidth="1.8">
                <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 21h6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Chat interface ────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden mb-10"
          style={{ background: 'var(--glass)', border: '1px solid rgba(191,159,241,0.2)' }}>

          {/* Messages */}
          {messages.length > 0 && (
            <div className="px-6 pt-5 space-y-5 overflow-y-auto" style={{ maxHeight: '520px' }}>
              {messages.map((msg, idx) => (
                <div key={idx}>
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="text-sm font-light px-4 py-2.5 rounded-2xl max-w-[75%]"
                        style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.85)' }}>
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'linear-gradient(135deg, #BF9FF1, #7193ED)' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                      </div>
                      <div className="flex-1 space-y-2 min-w-0">
                        {/* Tool calls */}
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {msg.toolCalls.map((tc, ti) => (
                              <span key={ti}
                                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-light"
                                style={{
                                  background: tc.status === 'done' ? 'rgba(200,242,107,0.08)' : 'rgba(255,255,255,0.05)',
                                  border: `1px solid ${tc.status === 'done' ? 'rgba(200,242,107,0.2)' : 'rgba(255,255,255,0.1)'}`,
                                  color: tc.status === 'done' ? '#C8F26B' : 'rgba(255,255,255,0.4)',
                                }}>
                                {tc.status === 'running' ? (
                                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.4)' }} />
                                ) : (
                                  <span style={{ color: '#C8F26B' }}>✓</span>
                                )}
                                {tc.status === 'done' ? tc.summary : tc.label + '···'}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Response text */}
                        {msg.content ? (
                          <div className="rounded-xl px-4 py-3"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <MD text={msg.content} />
                            {msg.streaming && (
                              <span className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse rounded-sm"
                                style={{ background: '#BF9FF1', verticalAlign: 'middle' }} />
                            )}
                            {!msg.streaming && msg.tokens && (
                              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.15)' }}>
                                {msg.tokens.toLocaleString()} tokens
                              </p>
                            )}
                          </div>
                        ) : msg.streaming && (!msg.toolCalls?.length || msg.toolCalls.every(tc => tc.status === 'done')) ? (
                          <div className="px-4 py-3 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <span className="inline-block w-1.5 h-3.5 animate-pulse rounded-sm" style={{ background: '#BF9FF1' }} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Suggestions (empty state) */}
          {messages.length === 0 && (
            <div className="px-6 pt-6 pb-2">
              <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>
                Nova reads across every system, workflow, and signal in your org — then acts. Here's what it can do.
              </p>

              {/* Capability tiles with concrete example I/O */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-5">
                {[
                  {
                    label: 'Diagnose',
                    color: '#F7C700',
                    prompt: 'Which systems need attention?',
                    example: 'Marketing health 64% · stalled waiting on Typeform signal · suggested fix: reconnect webhook',
                  },
                  {
                    label: 'Summarise',
                    color: '#7193ED',
                    prompt: 'Show me a full overview',
                    example: '3 systems · 12 active workflows · 4 drifting · 8 unreviewed runs · 1 goal behind',
                  },
                  {
                    label: 'Find bottlenecks',
                    color: '#BF9FF1',
                    prompt: 'Where are the bottlenecks?',
                    example: 'Review stage in "Content" averages 2.4d — stage 3 of 5 is the longest tail across workflows',
                  },
                  {
                    label: 'Act',
                    color: '#C8F26B',
                    prompt: 'Create a weekly retro workflow for Operations',
                    example: 'Drafted 4-stage workflow · linked to Operations system · ready to run or edit',
                  },
                ].map(cap => (
                  <button
                    key={cap.label}
                    onClick={() => { setInput(cap.prompt); setTimeout(() => { const form = inputRef.current?.closest('form'); if (form) form.requestSubmit(); }, 50); }}
                    className="text-left p-3.5 rounded-xl transition-all"
                    style={{ background: `${cap.color}06`, border: `1px solid ${cap.color}18` }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] tracking-[0.16em] font-light uppercase" style={{ color: cap.color }}>
                        {cap.label}
                      </span>
                      <span className="text-[10px] font-light" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        Try →
                      </span>
                    </div>
                    <p className="text-xs font-light mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      "{cap.prompt}"
                    </p>
                    <p className="text-[11px] font-light leading-relaxed italic" style={{ color: 'var(--text-3)' }}>
                      → {cap.example}
                    </p>
                  </button>
                ))}
              </div>

              <p className="text-[10px] tracking-[0.16em] uppercase font-light mb-2" style={{ color: 'var(--text-3)', opacity: 0.6 }}>
                More prompts
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setInput(s); setTimeout(() => { const form = inputRef.current?.closest('form'); if (form) form.requestSubmit(); }, 50); }}
                    className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.4)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-6 mt-3 text-xs px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#FF7070' }}>
              {error}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-6 py-4 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Nova about any system, workflow, or pattern across the org···"
              rows={2}
              disabled={streaming}
              className="w-full text-sm font-light px-4 py-3 pr-14 rounded-xl focus:outline-none resize-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
              }}
            />
            <button type="submit" disabled={!input.trim() || streaming}
              className="absolute bottom-7 right-9 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: 'linear-gradient(135deg, #BF9FF1, #7193ED)' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                <path d="M1 6h10M6 1l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {messages.length > 0 && (
              <button type="button" onClick={() => { setMessages([]); setError(''); }}
                className="absolute bottom-7 right-20 text-xs px-2 py-1 rounded-lg transition-all"
                style={{ color: 'rgba(255,255,255,0.2)' }}>
                Clear
              </button>
            )}
          </form>
        </div>

        {/* ── Interaction log ───────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>
              INTERACTION LOG
              {logsLoaded && (
                <span className="ml-2 normal-case tracking-normal" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {filteredLogs.length} of {logs.length}
                </span>
              )}
            </p>
          </div>

          {/* Log filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="11" height="11" viewBox="0 0 12 12" fill="none">
                <circle cx="5" cy="5" r="3.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2"/>
                <path d="M8 8l2.5 2.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <input value={logSearch} onChange={e => setLogSearch(e.target.value)}
                placeholder="Search queries···"
                className="w-full text-sm font-light pl-8 pr-3 py-2 rounded-lg focus:outline-none"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'white' }} />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button onClick={() => setSelectedSystem('')}
                className="text-xs font-light px-3 py-1.5 rounded-full flex-shrink-0 transition-all"
                style={{
                  background: !selectedSystem ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: `1px solid ${!selectedSystem ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
                  color: !selectedSystem ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                }}>
                All
              </button>
              {systems.map(s => (
                <button key={s.id} onClick={() => setSelectedSystem(s.id === selectedSystem ? '' : s.id)}
                  className="text-xs font-light px-3 py-1.5 rounded-full flex-shrink-0 transition-all flex items-center gap-1.5"
                  style={{
                    background: selectedSystem === s.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: `1px solid ${selectedSystem === s.id ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
                    color: selectedSystem === s.id ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                  }}>
                  {s.color && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />}
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {!logsLoaded ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center rounded-xl" style={{ border: '1px dashed var(--glass-border)' }}>
              <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {logs.length === 0 ? 'No interactions yet — ask Nova something above' : 'No matches'}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredLogs.map(log => (
                <div key={log.id}
                  className="rounded-xl overflow-hidden cursor-pointer transition-all"
                  style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                  <div className="px-5 py-3.5">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-2 flex-shrink-0 mt-0.5 w-[100px]">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: log.systemColor ?? 'rgba(255,255,255,0.2)' }} />
                        {log.systemId ? (
                          <Link href={`/systems/${log.systemId}`} onClick={e => e.stopPropagation()}
                            className="text-xs font-light truncate hover:text-white/60 transition-colors"
                            style={{ color: 'var(--text-3)' }}>
                            {log.systemName}
                          </Link>
                        ) : (
                          <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Global</span>
                        )}
                      </div>
                      <p className="flex-1 text-sm font-light truncate italic" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        "{log.query}"
                      </p>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {log.tokens && (
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>{log.tokens.toLocaleString()} tk</span>
                        )}
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{timeAgo(log.createdAt)}</span>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                          style={{ transform: expanded === log.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: 'rgba(255,255,255,0.2)' }}>
                          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    {expanded !== log.id && log.response && (
                      <p className="text-xs mt-2 ml-[116px] line-clamp-1 leading-relaxed" style={{ color: 'var(--text-3)' }}>
                        {stripMarkdown(log.response).slice(0, 200)}
                      </p>
                    )}
                  </div>
                  {expanded === log.id && (
                    <div className="px-5 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="ml-[116px]">
                        <p className="text-xs mt-3 mb-2" style={{ color: 'var(--text-3)' }}>Response</p>
                        <div className="text-sm font-light leading-relaxed whitespace-pre-wrap"
                          style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {log.response || <span style={{ opacity: 0.4 }}>No response recorded</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                          {log.tokens && (
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
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
      </div>
      <NovaSecondBrainPanel open={brainOpen} onClose={() => setBrainOpen(false)} />
    </div>
  );
}
