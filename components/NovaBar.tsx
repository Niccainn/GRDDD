'use client';

import { useState, useRef, useEffect } from 'react';

type LogEntry = {
  id: string;
  input: string;
  output: string;
  createdAt: string;
  tokens: number | null;
};

export default function NovaBar({
  systemId,
  systemName,
  recentLogs,
}: {
  systemId: string;
  systemName: string;
  recentLogs: LogEntry[];
}) {
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [currentOutput, setCurrentOutput] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>(recentLogs);
  const [error, setError] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [currentOutput]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const query = input.trim();
    setInput('');
    setCurrentOutput('');
    setError('');
    setStreaming(true);

    try {
      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemId, input: query }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Nova failed to respond');
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let output = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.text) {
            output += data.text;
            setCurrentOutput(output);
          }

          if (data.error) {
            setError(data.error);
          }

          if (data.done) {
            setLogs((prev) => [
              {
                id: data.executionId,
                input: query,
                output,
                createdAt: new Date().toISOString(),
                tokens: null,
              },
              ...prev.slice(0, 9),
            ]);
            setCurrentOutput('');
          }
        }
      }
    } catch (err) {
      setError('Connection error — check your API key and try again');
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="space-y-6">
      {/* Nova Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-[#BF9FF1] to-[#7193ED] rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-light">Nova</h2>
          <p className="text-xs text-white/40">Intelligence engine for {systemName}</p>
        </div>
        <div className={`ml-auto w-2 h-2 rounded-full ${streaming ? 'bg-[#BF9FF1] animate-pulse' : 'bg-white/20'}`} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask Nova anything about ${systemName}... (Enter to send, Shift+Enter for new line)`}
          rows={3}
          disabled={streaming}
          className="w-full bg-white/5 border border-[#BF9FF1]/30 rounded-xl px-4 py-3 pr-16 text-white placeholder:text-white/30 text-sm font-light focus:outline-none focus:border-[#BF9FF1]/60 focus:ring-1 focus:ring-[#BF9FF1]/30 transition-all resize-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || streaming}
          className="absolute bottom-3 right-3 w-8 h-8 bg-gradient-to-br from-[#BF9FF1] to-[#7193ED] rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30"
        >
          {streaming ? (
            <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
            </svg>
          )}
        </button>
      </form>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 font-light">
          {error}
        </div>
      )}

      {/* Streaming output */}
      {streaming && currentOutput && (
        <div
          ref={outputRef}
          className="bg-white/5 border border-[#BF9FF1]/20 rounded-xl p-4 max-h-64 overflow-y-auto"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 bg-[#BF9FF1] rounded-full animate-pulse" />
            <span className="text-xs text-[#BF9FF1] font-light">Nova responding...</span>
          </div>
          <p className="text-sm text-white/80 font-light whitespace-pre-wrap leading-relaxed">{currentOutput}</p>
        </div>
      )}

      {/* Log history */}
      {logs.length > 0 && (
        <div>
          <h3 className="text-sm text-white/40 font-light mb-3">Recent activity</h3>
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-white/3 border border-white/8 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p className="text-xs text-white/50 font-light italic">"{log.input}"</p>
                  <span className="text-xs text-white/30 whitespace-nowrap font-light flex-shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-white/70 font-light whitespace-pre-wrap leading-relaxed line-clamp-4">
                  {log.output}
                </p>
                {log.tokens && (
                  <p className="text-xs text-white/20 mt-2">{log.tokens} tokens</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {logs.length === 0 && !streaming && (
        <div className="text-center py-6">
          <p className="text-xs text-white/30 font-light">No activity yet. Ask Nova something to get started.</p>
        </div>
      )}
    </div>
  );
}
