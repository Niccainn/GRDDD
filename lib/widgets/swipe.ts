/**
 * Swipe gesture helper for canvas navigation.
 *
 * Returns handlers you spread onto the container you want to
 * swipe. Triggers onLeft / onRight when a horizontal swipe exceeds
 * a distance or velocity threshold, favoring commit over cancel
 * so the gesture feels confident, not indecisive.
 *
 * Design intent (Apple-tier): the follow animation is the caller's
 * job — this hook just reports intent. That keeps the math simple
 * and lets each page pick its own settle curve.
 */
import { useRef } from 'react';

type SwipeOpts = {
  onLeft?: () => void;    // user swiped rightward → go to previous
  onRight?: () => void;   // user swiped leftward → go to next
  onMove?: (dx: number) => void;
  onEnd?: () => void;
  /** Minimum distance in px before we count a swipe. Default 64. */
  minDistance?: number;
  /** Minimum velocity in px/ms for a flick to count. Default 0.35. */
  minVelocity?: number;
  /** Reject swipes that are more vertical than horizontal. Default true. */
  requireHorizontal?: boolean;
};

export function useSwipe(opts: SwipeOpts) {
  const state = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startT: number;
    lastX: number;
    lastT: number;
    locked: 'h' | 'v' | null;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startT: 0,
    lastX: 0,
    lastT: 0,
    locked: null,
  });

  const minDistance = opts.minDistance ?? 64;
  const minVelocity = opts.minVelocity ?? 0.35;
  const requireHorizontal = opts.requireHorizontal ?? true;

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    state.current = {
      active: true,
      startX: t.clientX,
      startY: t.clientY,
      startT: Date.now(),
      lastX: t.clientX,
      lastT: Date.now(),
      locked: null,
    };
  }

  function onTouchMove(e: React.TouchEvent) {
    const s = state.current;
    if (!s.active) return;
    const t = e.touches[0];
    const dx = t.clientX - s.startX;
    const dy = t.clientY - s.startY;

    // Lock the axis after 12px of movement so a vertical scroll
    // doesn't accidentally trigger a swipe.
    if (s.locked === null && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
      if (requireHorizontal && Math.abs(dy) > Math.abs(dx)) {
        s.locked = 'v';
      } else {
        s.locked = 'h';
      }
    }

    s.lastX = t.clientX;
    s.lastT = Date.now();

    if (s.locked === 'h') {
      opts.onMove?.(dx);
    }
  }

  function onTouchEnd() {
    const s = state.current;
    if (!s.active) return;
    s.active = false;
    opts.onEnd?.();
    if (s.locked !== 'h') return;
    const dx = s.lastX - s.startX;
    const dt = Math.max(1, s.lastT - s.startT);
    const velocity = Math.abs(dx) / dt;
    if (Math.abs(dx) >= minDistance || velocity >= minVelocity) {
      if (dx > 0) opts.onLeft?.();
      else opts.onRight?.();
    }
  }

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd };
}
