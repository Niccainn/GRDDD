'use client';

/**
 * /agents — the "prompts as agents" list surface.
 *
 * This page is the wedge: instead of typing a fresh prompt into a
 * chat window, every prompt lives here as a named, re-runnable object
 * with a URL, a history, an owner, and (soon) a schedule.
 *
 * The card grid shows each agent's name, emoji, description, when it
 * last ran, and a run-count chip. Clicking into a card opens the
 * detail view where the prompt can be edited in place.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SampleDataBanner from '@/components/SampleDataBanner';

type AgentListItem = {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  status: string;
  model: string | null;
  lastRunAt: string | null;
  createdAt: string;
  environmentId: string;
  environmentName: string;
  environmentColor: string | null;
  runCount: number;
};

function timeAgo(iso: string | null) {
  if (!iso) return 'never';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((data: AgentListItem[]) => {
        setAgents(data);
        setLoaded(true);
      });
  }, []);

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
      <SampleDataBanner />
      <div className="flex items-start justify-between mb-8 max-w-5xl">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">Agents</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Reusable AI automations — build once, run anytime with any input
          </p>
        </div>
        <Link
          href="/agents/new"
          className="text-xs font-light px-4 py-2 rounded-lg transition-all"
          style={{
            background: 'rgba(200,242,107,0.1)',
            border: '1px solid rgba(200,242,107,0.25)',
            color: '#C8F26B',
          }}
        >
          + New agent
        </Link>
      </div>

      {!loaded ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-xl animate-pulse"
              style={{ background: 'var(--glass)' }}
            />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center max-w-xl"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 mx-auto"
            style={{ background: 'rgba(200,242,107,0.08)', border: '1px solid rgba(200,242,107,0.15)' }}>
            <svg width="18" height="18" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5L12.5 4.5V10.5L7.5 13.5L2.5 10.5V4.5L7.5 1.5Z" stroke="#C8F26B" strokeWidth="1.1" strokeLinejoin="round"/><circle cx="7.5" cy="7.5" r="1.75" stroke="#C8F26B" strokeWidth="1.1"/></svg>
          </div>
          <p className="text-lg font-extralight mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Create your first agent
          </p>
          <p className="text-xs mb-6 leading-relaxed" style={{ color: 'var(--text-3)' }}>
            Agents are reusable AI automations. Write a set of instructions once, then run
            them whenever you need — with different inputs, on a schedule, or triggered
            from any connected integration.
          </p>
          <Link
            href="/agents/new"
            className="text-xs font-light px-4 py-2 rounded-lg inline-block transition-all"
            style={{
              background: 'rgba(200,242,107,0.1)',
              border: '1px solid rgba(200,242,107,0.25)',
              color: '#C8F26B',
            }}
          >
            Create your first agent →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="block rounded-xl p-5 transition-all hover:scale-[1.01]"
              style={{
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                minHeight: '160px',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {agent.emoji ?? '◆'}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-light truncate"
                      style={{ color: 'var(--text-1)' }}
                    >
                      {agent.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                      {agent.environmentName}
                    </p>
                  </div>
                </div>
                {agent.status !== 'ACTIVE' && (
                  <span
                    className="text-[10px] tracking-wider px-2 py-0.5 rounded"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      color: 'var(--text-3)',
                    }}
                  >
                    {agent.status}
                  </span>
                )}
              </div>

              {agent.description && (
                <p
                  className="text-xs font-light mb-4 line-clamp-2"
                  style={{ color: 'var(--text-2)' }}
                >
                  {agent.description}
                </p>
              )}

              <div
                className="flex items-center justify-between pt-3 mt-auto"
                style={{ borderTop: '1px solid var(--glass-border)' }}
              >
                <span className="text-[10px] tracking-wider" style={{ color: 'var(--text-3)' }}>
                  RAN {timeAgo(agent.lastRunAt).toUpperCase()}
                </span>
                <span
                  className="text-[10px] tabular-nums px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--text-3)',
                  }}
                >
                  {agent.runCount} runs
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
