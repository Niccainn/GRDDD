'use client';

import { useEffect, useState, useCallback } from 'react';

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => {
    fetch('/api/notifications?limit=1')
      .then(r => r.json())
      .then(d => setUnread(d.unreadCount ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  // Listen for unread count updates from the panel
  useEffect(() => {
    function handleUpdate(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.count === 'number') {
        setUnread(detail.count);
      }
    }
    window.addEventListener('notification-unread-update', handleUpdate);
    return () => window.removeEventListener('notification-unread-update', handleUpdate);
  }, []);

  function togglePanel() {
    window.dispatchEvent(new CustomEvent('toggle-notification-panel'));
  }

  return (
    <button
      onClick={togglePanel}
      className="relative p-2 rounded-lg transition-all hover:bg-white/[0.04]"
      style={{ color: 'var(--text-3)' }}
      title="Notifications"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
      {unread > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white"
          style={{ background: '#FF5757', fontSize: 9, fontWeight: 500 }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
