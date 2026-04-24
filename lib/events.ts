/**
 * GRID custom events — the event-driven-sync tenet in one file.
 *
 * Firing a `grid:*` event lets any subscribed client component refresh
 * without a page reload. This is how the Sidebar, SkillSpace, and
 * widgets stay live when data mutates elsewhere.
 *
 * Server-initiated events: call `fireSkillAdvanced(...)` from an API
 * route to dispatch to the authoring identity's next-page-load.
 * (Current implementation is a no-op shim — the client fires locally
 * on mutation. A server-sent-events bridge is the next step.)
 */

export const SKILL_ADVANCED = 'grid:skill-advanced';
export const COURSE_COMPLETED = 'grid:course-completed';
export const MEETING_PROCESSED = 'grid:meeting-processed';

export type SkillAdvancedDetail = {
  skillTag: string;
  identityId: string;
  courseId?: string;
  lessonId?: string;
  score?: number;
};

/** Client-side dispatcher. Safe in SSR (no-op when `window` is absent). */
export function fireSkillAdvanced(detail: SkillAdvancedDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SKILL_ADVANCED, { detail }));
}
