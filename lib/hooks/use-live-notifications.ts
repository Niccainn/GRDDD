'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useLiveNotifications() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource('/api/sse');
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      retryCountRef.current = 0;
    });

    es.addEventListener('notification', (e) => {
      try {
        const data = JSON.parse(e.data);
        // Dispatch the custom DOM event that NotificationBell listens for
        window.dispatchEvent(
          new CustomEvent('notification-unread-update', {
            detail: { count: data.unreadCount ?? data.count ?? 0 },
          })
        );
      } catch {
        // Ignore malformed events
      }
    });

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;

      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30_000);
      retryCountRef.current += 1;

      retryTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [connect]);
}
