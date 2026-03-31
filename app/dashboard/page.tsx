'use client';

import { useEffect, useState } from 'react';
import OperateCommand from '@/components/OperateCommand';

type System = { id: string; name: string; color: string | null; healthScore: number | null; environment: { name: string } };
type LogEntry = { id: string; input: string; output: string; systemName: string; createdAt: string };
type Workflow = { id: string; name: string; status: string; system: { name: string } };

export default function OperatePage() {
  const [systems, setSystems] = useState<System[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/operate-data')
      .then(r => r.json())
      .then(d => { setSystems(d.systems); setLogs(d.logs); setWorkflows(d.workflows); setLoaded(true); });
  }, []);

  function handleNewLog(log: { input: string; output: string; systemName: string }) {
    setLogs(prev => [{ id: Date.now().toString(), ...log, createdAt: new Date().toISOString() }, ...prev.slice(0, 9)]);
  }

  const avgHealth = systems.length > 0
    ? systems.reduce((a, s) => a + (s.healthScore ?? 0), 0) / systems.length : 0;
  const alerts = systems.filter(s => (s.healthScore ?? 1) < 0.75);
  const activeWorkflows = workflows.filter(w => w.status === 'ACTIVE');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-10 pt-10 pb-2">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight">Operate</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Run and monitor your system in real time</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: alerts.length > 0 ? '#F7C700' : '#15AD70' }} />
            <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {alerts.length > 0 ? `${alerts.length} drift alert${alerts.length > 1 ? 's' : ''}` : 'System stable'}
            </span>
          </div>
        </div>
      </div>

      {/* Command Layer */}
      <div className="px-10 pt-10 pb-8">
        <OperateCommand systems={systems} onNewLog={handleNewLog} />
      </div>

      {/* Panels */}
      {loaded && (
        <div className="flex-1 px-10 pb-10 grid grid-cols-2 gap-5">
          {/* System State */}
          <div className="rounded-xl p-5 flex flex-col gap-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-tertiary)' }}>SYSTEM STATE</p>

            {/* Health */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-5xl font-extralight" style={{ color: avgHealth > 0.8 ? '#15AD70' : avgHealth > 0.5 ? '#F7C700' : '#FF4D4D' }}>
                  {Math.round(avgHealth * 100)}%
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Alignment score</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-light" style={{ color: 'var(--text-secondary)' }}>{systems.length} systems</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{activeWorkflows.length} active workflows</p>
              </div>
            </div>

            {/* Systems list */}
            <div className="space-y-1.5">
              {systems.length === 0 ? (
                <p className="text-xs py-4 text-center" style={{ color: 'var(--text-tertiary)' }}>No systems yet</p>
              ) : systems.map(s => (
                <a key={s.id} href={`/systems/${s.id}`}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg group transition-colors"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2.5">
                    {s.color && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />}
                    <span className="text-sm font-light group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.7)' }}>{s.name}</span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{s.environment.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.healthScore !== null && (
                      <span className="text-xs font-light" style={{ color: s.healthScore > 0.8 ? '#15AD70' : s.healthScore > 0.5 ? '#F7C700' : '#FF4D4D' }}>
                        {Math.round(s.healthScore * 100)}%
                      </span>
                    )}
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: (s.healthScore ?? 0) > 0.6 ? '#15AD70' : '#F7C700' }} />
                  </div>
                </a>
              ))}
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="space-y-1.5">
                {alerts.map(s => (
                  <div key={s.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg"
                    style={{ background: 'rgba(247,199,0,0.04)', border: '1px solid rgba(247,199,0,0.12)' }}>
                    <span style={{ color: '#F7C700', fontSize: '10px', marginTop: '2px' }}>⚠</span>
                    <p className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {s.name} below alignment threshold — {Math.round((s.healthScore ?? 0) * 100)}%
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Execution / Activity */}
          <div className="rounded-xl p-5 flex flex-col gap-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-tertiary)' }}>SYSTEM ACTIVITY</p>

            {logs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10">
                <div className="w-8 h-8 rounded-full mb-3 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v6l3 3" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No activity yet</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.12)' }}>Run a command above to get started</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '400px' }}>
                {logs.map((log, i) => (
                  <div key={log.id} className="group">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center flex-shrink-0" style={{ paddingTop: '4px' }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? '#C7F700' : 'rgba(255,255,255,0.12)' }} />
                        {i < logs.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: 'rgba(255,255,255,0.05)', minHeight: '24px' }} />}
                      </div>
                      <div className="flex-1 min-w-0 pb-3">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <p className="text-xs font-light truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            "{log.input}"
                          </p>
                          <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {log.systemName && (
                          <p className="text-xs mb-1.5" style={{ color: 'var(--text-tertiary)' }}>{log.systemName}</p>
                        )}
                        <p className="text-xs font-light leading-relaxed line-clamp-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {log.output}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
