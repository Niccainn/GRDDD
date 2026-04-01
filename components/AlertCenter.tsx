'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

type Alert = {
  id: string;
  type: 'health_drift' | 'stalled_execution' | 'paused_workflow';
  severity: 'warning' | 'critical';
  title: string;
  detail: string;
  href: string;
  createdAt: string;
};

const TYPE_ICON: Record<string, string> = {
  health_drift: '♥',
  stalled_execution: '⏸',
  paused_workflow: '⚠',
};

export default function AlertCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then(d => setAlerts(d.alerts ?? []));

    // Refresh every 60s
    const t = setInterval(() => {
      fetch('/api/alerts').then(r => r.json()).then(d => setAlerts(d.alerts ?? []));
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const visible = alerts.filter(a => !dismissed.has(a.id));
  const criticalCount = visible.filter(a => a.severity === 'critical').length;
  const warningCount = visible.filter(a => a.severity === 'warning').length;
  const total = visible.length;

  if (total === 0 && !open) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-7 h-7 rounded-lg transition-all"
        style={{
          background: open ? 'rgba(255,255,255,0.06)' : 'transparent',
          border: `1px solid ${open ? 'rgba(255,255,255,0.1)' : 'transparent'}`,
        }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          style={{ color: total > 0 ? (criticalCount > 0 ? '#FF6B6B' : '#F7C700') : 'rgba(255,255,255,0.3)' }}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        {total > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-light"
            style={{
              background: criticalCount > 0 ? '#FF6B6B' : '#F7C700',
              color: '#000',
              fontSize: '9px',
            }}>
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden shadow-2xl z-50"
          style={{ background: 'var(--surface-2, #1a1a1a)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.8)' }}>Alerts</span>
              {total > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: criticalCount > 0 ? 'rgba(255,107,107,0.15)' : 'rgba(247,199,0,0.12)',
                    color: criticalCount > 0 ? '#FF6B6B' : '#F7C700',
                  }}>
                  {total}
                </span>
              )}
            </div>
            {total > 0 && (
              <button
                onClick={() => setDismissed(new Set(alerts.map(a => a.id)))}
                className="text-xs font-light transition-colors"
                style={{ color: 'rgba(255,255,255,0.25)' }}>
                Clear all
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {visible.length === 0 ? (
              <div className="flex flex-col items-center py-10">
                <span className="text-2xl mb-2" style={{ opacity: 0.3 }}>✓</span>
                <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>All clear</p>
              </div>
            ) : (
              visible.map((alert, i) => (
                <div key={alert.id}
                  className="group relative"
                  style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <Link href={alert.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition-all block"
                    style={{ background: 'transparent' }}>
                    <span className="text-sm mt-0.5 flex-shrink-0"
                      style={{ color: alert.severity === 'critical' ? '#FF6B6B' : '#F7C700' }}>
                      {TYPE_ICON[alert.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-light mb-0.5 truncate"
                        style={{ color: alert.severity === 'critical' ? '#FF6B6B' : 'rgba(255,255,255,0.7)' }}>
                        {alert.title}
                      </p>
                      <p className="text-xs leading-relaxed"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {alert.detail}
                      </p>
                    </div>
                  </Link>
                  {/* Dismiss */}
                  <button
                    onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                    className="absolute top-2.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    style={{ color: 'rgba(255,255,255,0.2)' }}>
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer summary */}
          {total > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {criticalCount > 0 && (
                <span className="text-xs" style={{ color: '#FF6B6B' }}>{criticalCount} critical</span>
              )}
              {warningCount > 0 && (
                <span className="text-xs" style={{ color: '#F7C700' }}>{warningCount} warning{warningCount !== 1 ? 's' : ''}</span>
              )}
              <Link href="/dashboard" onClick={() => setOpen(false)}
                className="ml-auto text-xs font-light transition-colors"
                style={{ color: 'rgba(255,255,255,0.25)' }}>
                View Operate →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
