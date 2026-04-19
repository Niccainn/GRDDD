'use client';

import { useState, useRef, useEffect } from 'react';

const REPORT_TYPES = [
  { id: 'weekly',  label: 'Weekly Report',   desc: 'Operational summary across all systems' },
  { id: 'health',  label: 'Health Review',   desc: 'Deep-dive on system alignment scores' },
  { id: 'goals',   label: 'Goal Progress',   desc: 'OKR tracking and forecast' },
];

// Minimal markdown renderer
function MD({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-sm font-medium mt-6 mb-2"
          style={{ color: 'rgba(255,255,255,0.85)' }}>{line.slice(3)}</h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-base font-light mt-4 mb-3"
          style={{ color: 'rgba(255,255,255,0.95)' }}>{line.slice(2)}</h1>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-xs font-medium mt-4 mb-1.5 uppercase tracking-wider"
          style={{ color: 'rgba(255,255,255,0.5)' }}>{line.slice(4)}</h3>
      );
    } else if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
      elements.push(
        <p key={i} className="text-sm font-medium mt-3 mb-1"
          style={{ color: 'rgba(255,255,255,0.8)' }}>{line.slice(2, -2)}</p>
      );
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(
        <div key={i} className="flex gap-2 my-1 ml-2">
          <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.25)' }} />
          <span className="text-sm font-light leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.65)' }}>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\./.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex gap-3 my-1 ml-2">
          <span className="text-xs flex-shrink-0 mt-0.5 tabular-nums"
            style={{ color: 'rgba(255,255,255,0.25)' }}>{num}.</span>
          <span className="text-sm font-light leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.65)' }}>{renderInline(line.replace(/^\d+\.\s*/, ''))}</span>
        </div>
      );
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} className="my-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />);
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm font-light leading-relaxed my-0.5"
          style={{ color: 'rgba(255,255,255,0.65)' }}>{renderInline(line)}</p>
      );
    }
    i++;
  }
  return <div>{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**'))
      return <em key={i} style={{ color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="text-xs px-1.5 py-0.5 rounded"
        style={{ background: 'rgba(255,255,255,0.08)', color: '#68D0CA', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

type SavedReport = {
  id: string;
  type: string;
  content: string;
  tokens: number;
  generatedAt: string;
};

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState('weekly');
  const [generating, setGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [tokens, setTokens] = useState<number | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [activeReport, setActiveReport] = useState<SavedReport | null>(null);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load saved reports from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('grid-reports') ?? '[]');
      setSavedReports(saved);
    } catch { /* ignore */ }
  }, []);

  function saveReport(content: string, type: string, tok: number) {
    const report: SavedReport = {
      id: Date.now().toString(),
      type,
      content,
      tokens: tok,
      generatedAt: new Date().toISOString(),
    };
    const updated = [report, ...savedReports].slice(0, 10);
    setSavedReports(updated);
    setActiveReport(report);
    try { localStorage.setItem('grid-reports', JSON.stringify(updated)); } catch { /* ignore */ }
  }

  useEffect(() => {
    if (streamedText) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamedText]);

  async function generate() {
    setGenerating(true);
    setStreamedText('');
    setTokens(null);
    setActiveReport(null);

    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: selectedType }),
    });

    if (!res.ok) { setGenerating(false); return; }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let finalTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const ev = JSON.parse(line.slice(6));
          if (ev.type === 'text') {
            fullText += ev.text;
            setStreamedText(t => t + ev.text);
          } else if (ev.type === 'done') {
            finalTokens = ev.tokens;
            setTokens(ev.tokens);
          }
        } catch { /* skip */ }
      }
    }

    if (fullText) saveReport(fullText, selectedType, finalTokens);
    setGenerating(false);
  }

  async function copyReport() {
    const content = activeReport?.content ?? streamedText;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadReport() {
    const content = activeReport?.content ?? streamedText;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grid-${selectedType}-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  const displayText = activeReport?.content ?? streamedText;
  const hasContent = displayText.length > 0;

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-extralight tracking-tight mb-1">Reports</h1>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          Nova-generated organisation summaries and analysis
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: controls + history */}
        <div className="space-y-4">
          {/* Report type selector */}
          <div>
            <p className="text-xs tracking-[0.1em] mb-3" style={{ color: 'var(--text-3)' }}>REPORT TYPE</p>
            <div className="space-y-1.5">
              {REPORT_TYPES.map(rt => (
                <button key={rt.id} onClick={() => setSelectedType(rt.id)}
                  className="w-full text-left px-4 py-3 rounded-xl transition-all"
                  style={{
                    background: selectedType === rt.id ? 'rgba(191,159,241,0.08)' : 'var(--glass)',
                    border: `1px solid ${selectedType === rt.id ? 'rgba(191,159,241,0.25)' : 'var(--glass-border)'}`,
                  }}>
                  <p className="text-sm font-light mb-0.5"
                    style={{ color: selectedType === rt.id ? '#BF9FF1' : 'rgba(255,255,255,0.7)' }}>
                    {rt.label}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>{rt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button onClick={generate} disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-light text-sm transition-all disabled:opacity-40"
            style={{
              background: generating ? 'rgba(191,159,241,0.05)' : 'rgba(191,159,241,0.1)',
              border: '1px solid rgba(191,159,241,0.25)',
              color: '#BF9FF1',
            }}>
            {generating ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#BF9FF1' }} />
                Generating···
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                Generate with Nova
              </>
            )}
          </button>

          {/* History */}
          {savedReports.length > 0 && (
            <div>
              <p className="text-xs tracking-[0.1em] mb-3" style={{ color: 'var(--text-3)' }}>HISTORY</p>
              <div className="space-y-1.5">
                {savedReports.map(r => (
                  <button key={r.id} onClick={() => { setActiveReport(r); setStreamedText(''); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg transition-all"
                    style={{
                      background: activeReport?.id === r.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${activeReport?.id === r.id ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
                    }}>
                    <p className="text-xs font-light truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {REPORT_TYPES.find(rt => rt.id === r.type)?.label ?? r.type}
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {timeAgo(r.generatedAt)} · {r.tokens.toLocaleString()} tokens
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: report content */}
        <div className="col-span-2">
          {!hasContent && !generating ? (
            <div className="flex flex-col items-center justify-center py-32 rounded-xl"
              style={{ border: '1px dashed rgba(191,159,241,0.15)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(191,159,241,0.06)', border: '1px solid rgba(191,159,241,0.15)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BF9FF1" strokeWidth="1.3">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <p className="text-sm font-light mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>No report yet</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                Select a report type and click Generate
              </p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              {/* Toolbar */}
              <div className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {REPORT_TYPES.find(rt => rt.id === (activeReport?.type ?? selectedType))?.label}
                  </span>
                  {generating && (
                    <span className="text-xs animate-pulse" style={{ color: '#BF9FF1' }}>generating···</span>
                  )}
                  {tokens && !generating && (
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {tokens.toLocaleString()} tokens
                    </span>
                  )}
                </div>
                {hasContent && !generating && (
                  <div className="flex items-center gap-2">
                    <button onClick={copyReport}
                      className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: copied ? '#15AD70' : 'rgba(255,255,255,0.4)' }}>
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                    <button onClick={downloadReport}
                      className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.4)' }}>
                      ↓ .md
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="px-6 py-5">
                <MD text={displayText} />
                {generating && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm"
                    style={{ background: '#BF9FF1', verticalAlign: 'middle' }} />
                )}
                <div ref={bottomRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
