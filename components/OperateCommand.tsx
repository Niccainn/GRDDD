'use client';

import { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  'Launch a campaign',
  'Generate this week\'s content',
  'Audit brand alignment',
  'Build an onboarding workflow',
  'Summarise system activity',
];

const EXECUTION_STEPS = [
  'Interpreting request',
  'Selecting system context',
  'Processing',
  'Validating output',
];

type System = { id: string; name: string; color: string | null };

export default function OperateCommand({
  systems,
  onNewLog,
}: {
  systems: System[];
  onNewLog: (log: { input: string; output: string; systemName: string }) => void;
}) {
  const [input, setInput] = useState('');
  const [selectedSystemId, setSelectedSystemId] = useState(systems[0]?.id ?? '');
  const [phase, setPhase] = useState<'idle' | 'executing' | 'streaming' | 'done'>('idle');
  const [steps, setSteps] = useState<number>(0);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const selectedSystem = systems.find(s => s.id === selectedSystemId);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  async function handleSubmit(query?: string) {
    const q = (query ?? input).trim();
    if (!q || !selectedSystemId || phase !== 'idle') return;

    setInput('');
    setOutput('');
    setError('');
    setPhase('executing');
    setSteps(0);

    // Animate steps
    const stepTimers: ReturnType<typeof setTimeout>[] = [];
    stepTimers.push(setTimeout(() => setSteps(1), 100));
    stepTimers.push(setTimeout(() => setSteps(2), 700));
    stepTimers.push(setTimeout(() => setSteps(3), 1400));

    try {
      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemId: selectedSystemId, input: q }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Nova failed');
        setPhase('idle');
        stepTimers.forEach(clearTimeout);
        return;
      }

      setPhase('streaming');
      setSteps(3);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));
          if (data.text) { full += data.text; setOutput(full); }
          if (data.error) setError(data.error);
          if (data.done) {
            setSteps(4);
            setPhase('done');
            onNewLog({ input: q, output: full, systemName: selectedSystem?.name ?? '' });
          }
        }
      }
    } catch {
      setError('Connection error');
      setPhase('idle');
    } finally {
      stepTimers.forEach(clearTimeout);
    }
  }

  function reset() {
    setPhase('idle');
    setOutput('');
    setError('');
    setSteps(0);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Command input — idle state */}
      {phase === 'idle' && (
        <div>
          <div className="relative flex items-center rounded-2xl overflow-hidden"
            style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>

            {/* System pill */}
            {systems.length > 0 && (
              <div className="pl-4 flex-shrink-0">
                <select
                  value={selectedSystemId}
                  onChange={e => setSelectedSystemId(e.target.value)}
                  className="text-xs font-light appearance-none cursor-pointer pr-1 focus:outline-none"
                  style={{ background: 'transparent', color: 'rgba(255,255,255,0.35)' }}
                >
                  {systems.map(s => (
                    <option key={s.id} value={s.id} style={{ background: '#111' }}>{s.name}</option>
                  ))}
                </select>
                <span style={{ color: 'rgba(255,255,255,0.12)', marginLeft: '8px', marginRight: '4px' }}>|</span>
              </div>
            )}

            <input
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="What do you want to run?"
              autoFocus
              className="flex-1 px-4 py-5 text-base font-light bg-transparent focus:outline-none placeholder:text-white/20"
              style={{ color: 'white' }}
            />

            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim()}
              className="mr-3 w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
              style={{
                background: input.trim() ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.06)',
                opacity: input.trim() ? 1 : 0.3,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M7 2l5 5-5 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Ghost suggestions */}
          <div className="flex flex-wrap gap-2 mt-4">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => handleSubmit(s)}
                className="text-xs px-3 py-1.5 rounded-lg font-light transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Execution state */}
      {phase !== 'idle' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Steps header */}
          <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {phase === 'done' ? (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#C8F26B' }} />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#C7F700' }} />
                )}
                <span className="text-xs font-light" style={{ color: phase === 'done' ? '#C8F26B' : '#C7F700' }}>
                  {phase === 'done' ? 'Execution complete' : 'Executing'}
                </span>
              </div>
              {phase === 'done' && (
                <button onClick={reset} className="text-xs font-light transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  New command
                </button>
              )}
            </div>
            <div className="flex items-center gap-6">
              {EXECUTION_STEPS.map((step, i) => {
                const done = steps > i + 1;
                const active = steps === i + 1;
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    {done ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="#C8F26B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <div className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ background: active ? '#C7F700' : 'rgba(255,255,255,0.12)', animation: active ? 'pulse 1s infinite' : 'none' }} />
                    )}
                    <span className="text-xs font-light whitespace-nowrap"
                      style={{ color: done ? 'rgba(255,255,255,0.5)' : active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)' }}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Streaming output */}
          <div ref={outputRef} className="px-6 py-5 max-h-72 overflow-y-auto">
            {output ? (
              <p className="text-sm font-light whitespace-pre-wrap leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {output}
                {phase === 'streaming' && <span className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse" style={{ background: '#C7F700' }} />}
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: '#C7F700' }} />
                <span className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>Nova is thinking...</span>
              </div>
            )}
            {error && <p className="text-sm mt-3" style={{ color: '#FF4D4D' }}>{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
