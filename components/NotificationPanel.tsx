'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { relativeTime } from '@/lib/time';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

const TYPE_COLORS: Record<string, string> = {
  execution_complete: '#15AD70',
  execution_failed: '#FF6B6B',
  goal_reached: '#F7C700',
  mention: '#7193ED',
  system_alert: '#FF9F43',
  workflow_update: '#BF9FF1',
  comment_reply: '#4FC1E9',
  // Legacy types
  'comment.mention': '#7193ED',
  'task.assigned': '#7193ED',
  'task.commented': '#4FC1E9',
  'task.completed': '#15AD70',
  'execution.completed': '#15AD70',
  'execution.failed': '#FF6B6B',
  'signal.urgent': '#FF9F43',
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] ?? '#7193ED';
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export default function NotificationPanel({ open, onClose, onUnreadCountChange }: NotificationPanelProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=30');
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      onUnreadCountChange?.(data.unreadCount ?? 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  // Load on open + poll every 30s
  useEffect(() => {
    if (!open) return;
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [open, load]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    onUnreadCountChange?.(0);
  }

  async function clickNotification(n: Notification) {
    if (!n.read) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [n.id] }),
      });
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      onUnreadCountChange?.(newCount);
    }
    if (n.href) router.push(n.href);
    onClose();
  }

  async function deleteNotification(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const wasUnread = notifications.find(n => n.id === id && !n.read);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (wasUnread) {
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      onUnreadCountChange?.(newCount);
    }
    await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] transition-opacity duration-200"
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-screen w-[380px] z-[61] flex flex-col transition-transform duration-300 ease-out"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          background: 'rgba(12, 12, 18, 0.95)',
          backdropFilter: 'blur(80px)',
          WebkitBackdropFilter: 'blur(80px)',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-light tracking-[0.12em]" style={{ color: 'var(--text-1)' }}>
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-light"
                style={{
                  background: 'rgba(113, 147, 237, 0.15)',
                  color: '#7193ED',
                  border: '1px solid rgba(113, 147, 237, 0.2)',
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-light px-3 py-1.5 rounded-lg transition-all hover:bg-white/[0.04]"
                style={{ color: 'var(--text-3)' }}
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all hover:bg-white/[0.04]"
              style={{ color: 'var(--text-3)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div
                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--glass-border)', borderTopColor: 'transparent' }}
              />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-3)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-light" style={{ color: 'var(--text-2)' }}>All caught up</p>
              <p className="text-xs font-light mt-1" style={{ color: 'var(--text-3)' }}>No new notifications</p>
            </div>
          ) : (
            <div>
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => clickNotification(n)}
                  className="w-full text-left flex gap-3 px-6 py-4 transition-all group"
                  style={{
                    background: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                    borderBottom: '1px solid var(--glass-border)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = n.read
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(255,255,255,0.08)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = n.read
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(255,255,255,0.06)';
                  }}
                >
                  {/* Type dot */}
                  <div className="flex-shrink-0 mt-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: getTypeColor(n.type) }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-light leading-snug"
                      style={{
                        color: n.read ? 'var(--text-3)' : 'var(--text-1)',
                        fontWeight: n.read ? 300 : 400,
                      }}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p
                        className="text-xs font-light mt-1 line-clamp-2"
                        style={{ color: 'var(--text-3)' }}
                      >
                        {n.body}
                      </p>
                    )}
                    <p
                      className="text-xs font-light mt-1.5"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {relativeTime(n.createdAt)}
                    </p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => deleteNotification(e, n.id)}
                    className="flex-shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white/[0.06]"
                    style={{ color: 'var(--text-3)' }}
                    title="Remove notification"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
