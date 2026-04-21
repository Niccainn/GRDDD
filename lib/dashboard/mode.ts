/**
 * Dashboard mode gate — picks the right layout based on workspace state.
 *
 * Per PHASE_3_COCKPIT.md:
 *   Mode A — no Systems yet (re-entry to onboarding).
 *   Mode B — ≥1 System AND (workspace age <7 days OR <50 Nova actions).
 *   Mode C — ≥1 System AND workspace age ≥7 days AND ≥50 Nova actions.
 *
 * Phase 3 ships A + B; Mode C is gated behind a feature flag until
 * there's enough user history to justify surfacing metrics.
 */

export type DashboardMode = 'A' | 'B' | 'C';

export type WorkspaceSnapshot = {
  systemCount: number;
  /** ISO string, workspace creation timestamp */
  createdAt: string | null;
  /** Total Nova actions logged in this workspace */
  novaActionCount: number;
};

const MATURE_AGE_DAYS = 7;
const MATURE_ACTION_COUNT = 50;

// Set NEXT_PUBLIC_DASHBOARD_MODE_C=1 to allow Mode C for eligible workspaces.
// Default is false — users hit Mode B until we have real Mode C content to ship.
const MODE_C_ENABLED =
  (process.env.NEXT_PUBLIC_DASHBOARD_MODE_C ?? '0') === '1';

export function dashboardMode(ws: WorkspaceSnapshot): DashboardMode {
  if (ws.systemCount === 0) return 'A';

  if (!MODE_C_ENABLED) return 'B';

  const ageDays = ws.createdAt
    ? (Date.now() - new Date(ws.createdAt).getTime()) / 86_400_000
    : 0;
  if (ageDays < MATURE_AGE_DAYS) return 'B';
  if (ws.novaActionCount < MATURE_ACTION_COUNT) return 'B';
  return 'C';
}
