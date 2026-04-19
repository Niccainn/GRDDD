'use client';

import { useState, useRef, useEffect } from 'react';

type ToolCall = {
  name: string;
  label: string;
  status: 'running' | 'done';
  summary?: string;
};

type Message =
  | { role: 'user'; content: string }
  | { role: 'nova'; content: string; toolCalls?: ToolCall[]; streaming?: boolean; tokens?: number };

function MD({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      elements.push(<p key={i} className="text-xs font-medium mt-3 mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{line.slice(3)}</p>);
    } else if (line.startsWith('# ')) {
      elements.push(<p key={i} className="text-sm font-light mt-3 mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>{line.slice(2)}</p>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(
        <div key={i} className="flex gap-2 my-0.5">
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
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

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: '#68D0CA', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function ToolPill({ tool }: { tool: ToolCall }) {
  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-light my-0.5"
      style={{
        background: tool.status === 'done' ? 'rgba(200,242,107,0.08)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${tool.status === 'done' ? 'rgba(200,242,107,0.2)' : 'rgba(255,255,255,0.1)'}`,
        color: tool.status === 'done' ? '#C8F26B' : 'rgba(255,255,255,0.4)',
      }}>
      {tool.status === 'running' ? (
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.4)' }} />
      ) : (
        <span style={{ color: '#C8F26B' }}>✓</span>
      )}
      <span>{tool.status === 'done' ? tool.summary : tool.label + '···'}</span>
    </div>
  );
}

const SUGGESTIONS = [
  'What needs my attention today?',
  'Draft a social post about our latest update',
  'Where are the bottlenecks in my business?',
  'Give me a status update on everything',
  'Create a task to follow up with the team',
];

type GlobalNovaBarProps = {
  /** When set, auto-opens and pre-fills this query (caller should clear after use) */
  initialQuery?: string;
  /** Callback when bar opens/closes */
  onOpenChange?: (open: boolean) => void;
};

export default function GlobalNovaBar({ initialQuery, onOpenChange }: GlobalNovaBarProps = {}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialQueryHandled = useRef(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  // Handle initialQuery prop — open bar and pre-fill
  useEffect(() => {
    if (initialQuery && !initialQueryHandled.current) {
      initialQueryHandled.current = true;
      setOpen(true);
      setInput(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(v => !v);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const query = input.trim();
    setInput('');
    setError('');
    setStreaming(true);

    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setMessages(prev => [...prev, { role: 'nova', content: '', toolCalls: [], streaming: true }]);

    try {
      const res = await fetch('/api/nova/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Nova failed');
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
          try {
            const event = JSON.parse(line.slice(6));
            handleEvent(event);
          } catch { /* ignore */ }
        }
      }
    } catch {
      setError('Connection error — check your API key');
    } finally {
      setStreaming(false);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'nova') {
          updated[updated.length - 1] = { ...last, streaming: false };
        }
        return updated;
      });
    }
  }

  function handleEvent(event: { type: string; [key: string]: unknown }) {
    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role !== 'nova') return prev;

      switch (event.type) {
        case 'tool_start':
          return [
            ...updated.slice(0, -1),
            {
              ...last,
              toolCalls: [
                ...(last.toolCalls ?? []),
                { name: event.name as string, label: event.label as string, status: 'running' as const },
              ],
            },
          ];
        case 'tool_done':
          return [
            ...updated.slice(0, -1),
            {
              ...last,
              toolCalls: (last.toolCalls ?? []).map(tc =>
                tc.name === (event.name as string) && tc.status === 'running'
                  ? { ...tc, status: 'done' as const, summary: event.summary as string }
                  : tc
              ),
            },
          ];
        case 'text':
          return [
            ...updated.slice(0, -1),
            { ...last, content: last.content + (event.text as string) },
          ];
        case 'done':
          return [
            ...updated.slice(0, -1),
            { ...last, streaming: false, tokens: event.tokens as number },
          ];
        case 'error':
          setError(event.message as string);
          return updated;
        default:
          return prev;
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="mb-8">
      {/* Collapsed trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all group"
          style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #BF9FF1, #7193ED)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <span className="text-sm font-light flex-1 text-left transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            What would you like to work on?
          </span>
          <kbd className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }}>
            ⌘K
          </kbd>
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--glass)', border: '1px solid rgba(191,159,241,0.2)' }}>
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #BF9FF1, #7193ED)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <div>
                <span className="text-sm font-light">Nova</span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-3)' }}>global mode</span>
              </div>
              {streaming && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#BF9FF1' }} />
                  <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>thinking···</span>
                </div>
              )}
            </div>
            <button onClick={() => setOpen(false)}
              className="text-xs px-2 py-1 rounded transition-all"
              style={{ color: 'var(--text-3)' }}>
              ✕
            </button>
          </div>

          <div className="px-5 py-4">
            {/* Messages */}
            {messages.length > 0 && (
              <div className="space-y-4 mb-4 overflow-y-auto pr-1" style={{ maxHeight: '360px' }}>
                {messages.map((msg, idx) => (
                  <div key={idx}>
                    {msg.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="text-sm font-light px-3 py-2 rounded-xl max-w-[80%]"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)' }}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {msg.toolCalls.map((tc, ti) => <ToolPill key={ti} tool={tc} />)}
                          </div>
                        )}
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
                        ) : msg.streaming && (!msg.toolCalls || msg.toolCalls.every(tc => tc.status === 'done')) ? (
                          <div className="px-4 py-3 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <span className="inline-block w-1.5 h-3.5 animate-pulse rounded-sm" style={{ background: '#BF9FF1' }} />
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}

            {error && (
              <div className="text-xs px-3 py-2 rounded-lg mb-3"
                style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#FF7070' }}>
                {error}
              </div>
            )}

            {/* Suggestions (empty state) */}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.4)' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything — check on a project, draft content, find bottlenecks..."
                rows={2}
                disabled={streaming}
                className="w-full text-sm font-light px-4 py-3 pr-12 rounded-xl focus:outline-none resize-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                }}
              />
              <button type="submit" disabled={!input.trim() || streaming}
                className="absolute bottom-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: 'linear-gradient(135deg, #BF9FF1, #7193ED)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6h10M6 1l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
