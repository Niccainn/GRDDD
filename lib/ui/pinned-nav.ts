/**
 * pinned-nav — the tiny client-side store for the customizable
 * sidebar. Users pin any nav item (from the primary nav or the
 * collapsed APPS tree) to the top of their own sidebar. Storage is
 * localStorage — per-device, per-user. The server-side Canvas-like
 * persistence is a follow-up; this is the zero-schema path.
 *
 * Shape on disk:
 *   grid:pinned-nav = '[ "/projects", "/memory", "/finance" ]'
 */

const KEY = 'grid:pinned-nav';
const EVENT = 'grid:pinned-nav-changed';

export function readPinned(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function writePinned(next: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* quota or private mode — non-fatal */
  }
}

export function togglePinned(href: string): string[] {
  const current = readPinned();
  const next = current.includes(href)
    ? current.filter(h => h !== href)
    : [...current, href];
  writePinned(next);
  return next;
}

export function isPinned(href: string): boolean {
  return readPinned().includes(href);
}

export const PINNED_NAV_EVENT = EVENT;
