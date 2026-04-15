'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type LiveUpdateEvent = {
  type: 'execution.completed' | 'task.updated' | 'goal.progress' | 'workflow.status';
  entityId: string;
  data: unknown;
};

const SSE_FAILURE_THRESHOLD = 3;
const POLL_INTERVAL = 15_000;

export function useLiveUpdates(callback: (event: LiveUpdateEvent) => void) {
  const [lastUpdate, setLastUpdate] = useState<LiveUpdateEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [mode, setMode] = useState<'sse' | 'polling'>('sse');
  const eventSourceRef = useRef<EventSource | null>(null);
  const callbackRef = useRef(callback);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const consecutiveFailuresRef = useRef(0);
  const modeRef = useRef<'sse' | 'polling'>('sse');

  // Keep callback ref in sync without re-subscribing
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollIntervalRef.current = setInterval(() => {
      fetch('/api/sse/poll')
        .then((r) => r.json())
        .then((data) => {
          if (data.ts) {
            // Poll succeeded — the client can use the timestamp
            // to decide whether to refetch relevant data
            setIsConnected(true);
          }
        })
        .catch(() => {
          // Polling failed silently — no error to user
        });
    }, POLL_INTERVAL);
  }, [stopPolling]);

  const switchToPolling = useCallback(() => {
    modeRef.current = 'polling';
    setMode('polling');
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
      // If we were polling, switch back to SSE
      if (modeRef.current === 'polling') {
        stopPolling();
        modeRef.current = 'sse';
        setMode('sse');
      }
    });

    es.addEventListener('update', (e) => {
      try {
        const parsed = JSON.parse(e.data) as LiveUpdateEvent;
        setLastUpdate(parsed);
        callbackRef.current(parsed);
      } catch {
        // Ignore malformed events
      }
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

      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30_000);
      retryCountRef.current += 1;

      retryTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [stopPolling, switchToPolling]);

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

  return { lastUpdate, isConnected, mode };
}
