'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

/**
 * Persistent Nova input — fixed at bottom-right of every authenticated page.
 * Expands into a quick-ask input with inline streaming response.
 * Full conversations still happen on /nova — this is for quick queries from anywhere.
 */
export default function PersistentNovaBar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [responding, setResponding] = useState(false);
  const [response, setResponse] = useState('');
  const [tools, setTools] = useState<{ name: string; done: boolean; summary?: string }[]>([]);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isNovaPage = pathname === '/nova';
  if (isNovaPage) return null;

  const reset = () => {
    setQuery('');
    setResponse('');
    setTools([]);
    setError('');
    setResponding(false);
    if (abortRef.current) abortRef.current.abort();
  };

  const handleSubmit = async () => {
    if (!query.trim() || responding) return;
    const q = query.trim();
    setResponding(true);
    setResponse('');
    setTools([]);
    setError('');

    try {
      const abort = new AbortController();
      abortRef.current = abort;

      const res = await fetch('/api/nova/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
        signal: abort.signal,
      });

      if (!res.ok) {
        setError('Nova is unavailable right now');
        setResponding(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setResponding(false); return; }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          if (raw === '[DONE]') continue;
          try {
            const event = JSON.parse(raw);
            if (event.type === 'text') setResponse(prev => prev + event.text);
            if (event.type === 'tool_start') setTools(prev => [...prev, { name: event.name || event.label || 'tool', done: false }]);
            if (event.type === 'tool_done') setTools(prev => prev.map((t, i) => i === prev.length - 1 ? { ...t, done: true, summary: event.summary } : t));
            if (event.type === 'error') setError(event.message || 'Something went wrong');
          } catch {}
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') setError('Connection lost');
    } finally {
      setResponding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') { reset(); setExpanded(false); }
  };

  useEffect(() => {
    if (expanded && inputRef.current) inputRef.current.focus();
  }, [expanded]);

  const hasResponse = response || tools.length > 0 || error;

  return (
    <div
      className="fixed bottom-6 right-6 z-40 hidden md:flex flex-col items-end gap-2"
      style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      {/* Inline response popover */}
      {expanded && hasResponse && (
        <div
          className="animate-fade-in overflow-hidden"
          style={{
            background: 'rgba(8, 8, 12, 0.97)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(191, 159, 241, 0.15)',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            width: '380px',
            maxHeight: '240px',
          }}
        >
          {/* Tools */}
          {tools.length > 0 && (
            <div className="px-3 pt-3 flex flex-wrap gap-1">
              {tools.map((t, i) => (
                <span key={i} className="text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    background: t.done ? 'rgba(21,173,112,0.1)' : 'rgba(191,159,241,0.1)',
                    color: t.done ? '#15AD70' : 'var(--nova)',
                    border: `1px solid ${t.done ? 'rgba(21,173,112,0.2)' : 'rgba(191,159,241,0.2)'}`,
                  }}>
                  {t.done ? '✓' : '⟳'} {t.name}
                </span>
              ))}
            </div>
          )}

          {/* Response text */}
          {response && (
            <div className="px-3 py-2 overflow-y-auto" style={{ maxHeight: '160px' }}>
              <p className="text-xs font-light leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-1)' }}>
                {response}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2">
              <p className="text-xs font-light" style={{ color: 'var(--danger)' }}>{error}</p>
            </div>
          )}

          {/* Streaming indicator */}
          {responding && !response && !error && (
            <div className="px-3 py-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--nova)' }} />
              <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>Nova is thinking...</span>
            </div>
          )}

          {/* Footer */}
          <div className="px-3 py-2 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <Link href={`/nova?q=${encodeURIComponent(query)}`} className="text-[9px] font-light transition-colors hover:text-white/50" style={{ color: 'var(--text-3)' }}>
              Open in Nova →
            </Link>
            <button onClick={() => { reset(); }} className="text-[9px] font-light transition-colors hover:text-white/50" style={{ color: 'var(--text-3)' }}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      {expanded ? (
        <div
          className="flex items-center gap-2 animate-fade-in"
          style={{
            background: 'rgba(8, 8, 12, 0.95)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(191, 159, 241, 0.2)',
            borderRadius: '14px',
            padding: '6px 6px 6px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            width: '380px',
          }}
        >
          <span style={{ color: 'var(--nova)', opacity: 0.5, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (!query && !hasResponse) setExpanded(false); }}
            placeholder="Ask Nova anything..."
            disabled={responding}
            className="flex-1 text-xs font-light bg-transparent border-none outline-none disabled:opacity-50"
            style={{ color: 'var(--text-1)' }}
          />
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || responding}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: query.trim() ? 'rgba(191, 159, 241, 0.15)' : 'transparent',
              color: query.trim() ? 'var(--nova)' : 'var(--text-3)',
              opacity: query.trim() && !responding ? 1 : 0.3,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 transition-all group"
          style={{
            background: 'rgba(8, 8, 12, 0.9)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(191, 159, 241, 0.15)',
            borderRadius: '12px',
            padding: '8px 14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
          title="Ask Nova (quick)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
            style={{ color: 'var(--nova)', opacity: 0.6 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span className="text-xs font-light group-hover:text-white/60 transition-colors" style={{ color: 'var(--text-3)' }}>
            Nova
          </span>
        </button>
      )}
    </div>
  );
}
