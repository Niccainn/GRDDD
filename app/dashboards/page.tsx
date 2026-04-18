'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  loadDashboards,
  createDashboard,
  deleteDashboard,
  getDefaultDashboard,
  type CustomDashboard,
} from '@/lib/dashboards';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState<CustomDashboard[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    // Ensure default dashboard exists
    getDefaultDashboard();
    setDashboards(loadDashboards());
  }, []);

  function handleCreate() {
    if (!newName.trim()) return;
    createDashboard(newName.trim());
    setDashboards(loadDashboards());
    setNewName('');
    setShowNew(false);
  }

  function handleDelete(id: string) {
    deleteDashboard(id);
    setDashboards(loadDashboards());
  }

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-light tracking-tight mb-1" style={{ color: 'var(--text-1)' }}>
            Dashboards
          </h1>
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            Create and customize widget-based dashboards
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="text-xs font-light px-4 py-2 rounded-full transition-all"
          style={{
            background: 'rgba(113,147,237,0.08)',
            border: '1px solid rgba(113,147,237,0.2)',
            color: '#7193ED',
          }}
        >
          New dashboard
        </button>
      </div>

      {/* New dashboard inline form */}
      {showNew && (
        <div
          className="glass-deep rounded-2xl px-5 py-4 mb-6 flex items-center gap-3"
        >
          <input
            autoFocus
            type="text"
            placeholder="Dashboard name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="flex-1 bg-transparent text-sm font-light outline-none"
            style={{ color: 'var(--text-1)' }}
          />
          <button
            onClick={handleCreate}
            className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
            style={{
              background: 'rgba(21,173,112,0.1)',
              border: '1px solid rgba(21,173,112,0.2)',
              color: '#15AD70',
            }}
          >
            Create
          </button>
          <button
            onClick={() => { setShowNew(false); setNewName(''); }}
            className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
            style={{ color: 'var(--text-3)' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Dashboard cards */}
      {dashboards.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl"
          style={{ border: '1px dashed var(--glass-border)' }}
        >
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>
            No dashboards yet
          </p>
          <p className="text-xs font-light max-w-sm text-center" style={{ color: 'var(--text-3)' }}>
            Build custom widget boards to monitor your systems, workflows, and goals in real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {dashboards.map((db) => (
            <div
              key={db.id}
              className="glass-deep rounded-2xl overflow-hidden group relative"
            >
              <Link
                href={`/dashboards/${db.id}`}
                className="block px-5 py-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-light group-hover:text-white transition-colors" style={{ color: 'var(--text-1)' }}>
                    {db.name}
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
                    {db.widgets.length} widget{db.widgets.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    Updated {timeAgo(db.updatedAt)}
                  </span>
                </div>
                {/* Mini preview grid */}
                <div className="mt-4 relative h-12 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {db.widgets.slice(0, 8).map((w) => {
                    const cols = 12;
                    const left = (w.position.x / cols) * 100;
                    const width = (w.position.w / cols) * 100;
                    const maxRow = Math.max(...db.widgets.map((ww) => ww.position.y + ww.position.h), 10);
                    const top = (w.position.y / maxRow) * 100;
                    const height = (w.position.h / maxRow) * 100;
                    return (
                      <div
                        key={w.id}
                        className="absolute rounded-sm"
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                          background: 'rgba(113,147,237,0.12)',
                          border: '1px solid rgba(113,147,237,0.15)',
                        }}
                      />
                    );
                  })}
                </div>
              </Link>

              {/* Delete button */}
              {db.id !== 'default' && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(db.id); }}
                  className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.15)' }}
                  title="Delete dashboard"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2L8 8M8 2L2 8" stroke="#FF6B6B" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
