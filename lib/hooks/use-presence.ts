'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export type OnlineUser = {
  id: string;
  name: string;
  initials: string;
  avatar: string | null;
  currentPage: string;
  connectedAt: string;
};

const SSE_FAILURE_THRESHOLD = 3;
const PRESENCE_POLL_INTERVAL = 30_000;

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [mode, setMode] = useState<'sse' | 'polling'>('sse');
  const pathname = usePathname();
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const consecutiveFailuresRef = useRef(0);
  const modeRef = useRef<'sse' | 'polling'>('sse');
  const pathnameRef = useRef(pathname);

  // Keep pathname ref in sync
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Send page location updates when route changes
  useEffect(() => {
    if (!isConnected) return;
    fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pathname }),
    }).catch(() => {});
  }, [pathname, isConnected]);

  const fetchOnlineUsers = useCallback(() => {
    fetch('/api/presence')
      .then((r) => r.json())
      .then((d) => {
        if (d.users) setOnlineUsers(d.users);
      })
      .catch(() => {});
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    // Fetch immediately, then on interval
    fetchOnlineUsers();
    pollIntervalRef.current = setInterval(() => {
      fetchOnlineUsers();
    }, PRESENCE_POLL_INTERVAL);
  }, [stopPolling, fetchOnlineUsers]);

  const switchToPolling = useCallback(() => {
    modeRef.current = 'polling';
    setMode('polling');
    setIsConnected(true); // Still "connected" via polling
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    startPolling();
  }, [startPolling]);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource('/api/sse');
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setIsConnected(true);
      retryCountRef.current = 0;
      consecutiveFailuresRef.current = 0;
      fetchOnlineUsers();

      // If we were polling, switch back to SSE
      if (modeRef.current === 'polling') {
        stopPolling();
        modeRef.current = 'sse';
        setMode('sse');
      }

      // Send initial page location
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: pathnameRef.current }),
      }).catch(() => {});
    });

    es.addEventListener('presence', () => {
      // Re-fetch the full list on any presence change
      fetchOnlineUsers();
    });

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      eventSourceRef.current = null;

      consecutiveFailuresRef.current += 1;

      // After 3 consecutive failures, fall back to polling
      if (consecutiveFailuresRef.current >= SSE_FAILURE_THRESHOLD) {
        switchToPolling();
        return;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30_000);
      retryCountRef.current += 1;

      retryTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [fetchOnlineUsers, stopPolling, switchToPolling]);

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
      stopPolling();
    };
  }, [connect, stopPolling]);

  return {
    onlineUsers,
    isConnected,
    mode,
    connectionCount: onlineUsers.length,
  };
}
