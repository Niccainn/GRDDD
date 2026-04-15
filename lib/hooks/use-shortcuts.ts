'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const NAV_MAP: Record<string, string> = {
  h: '/dashboard',
  t: '/tasks',
  n: '/nova',
  w: '/workflows',
  e: '/environments',
  i: '/inbox',
  s: '/settings',
  f: '/finance',
  d: '/documents',
};

function isEditableTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const gPending = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearG = useCallback(() => {
    gPending.current = false;
    if (gTimer.current) {
      clearTimeout(gTimer.current);
      gTimer.current = null;
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;

      // Escape — close help modal
      if (e.key === 'Escape') {
        if (helpOpen) {
          setHelpOpen(false);
          e.preventDefault();
        }
        return;
      }

      // Don't intercept if modifier keys are held (except for ? which needs Shift)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // ? — toggle shortcuts help
      if (e.key === '?') {
        e.preventDefault();
        setHelpOpen(prev => !prev);
        clearG();
        return;
      }

      // g prefix — start combo
      if (e.key === 'g' && !gPending.current) {
        gPending.current = true;
        gTimer.current = setTimeout(() => {
          gPending.current = false;
        }, 1000);
        return;
      }

      // g + <key> combo
      if (gPending.current) {
        clearG();
        const dest = NAV_MAP[e.key];
        if (dest) {
          e.preventDefault();
          router.push(dest);
          return;
        }
      }

      // c — create new task
      if (e.key === 'c') {
        e.preventDefault();
        router.push('/tasks?new=1');
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearG();
    };
  }, [router, helpOpen, clearG]);

  return { helpOpen, setHelpOpen };
}
