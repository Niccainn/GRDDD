/**
 * Lightweight analytics event tracking for onboarding funnel.
 *
 * Events are stored in the AuditLog table (already exists) with
 * action prefixed by "funnel." for easy querying. This avoids
 * adding a third-party analytics dependency in alpha.
 *
 * In production, replace the fetch call with your analytics provider
 * (Posthog, Amplitude, Mixpanel, etc.).
 */

export type FunnelEvent =
  | 'funnel.sign_up_started'
  | 'funnel.sign_up_completed'
  | 'funnel.onboarding_step_1'
  | 'funnel.onboarding_step_2'
  | 'funnel.onboarding_step_3'
  | 'funnel.onboarding_step_4'
  | 'funnel.onboarding_completed'
  | 'funnel.first_system_created'
  | 'funnel.first_workflow_run'
  | 'funnel.first_review';

export function trackEvent(event: FunnelEvent, metadata?: Record<string, unknown>) {
  // Fire-and-forget — never block the UI for analytics
  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, metadata, timestamp: new Date().toISOString() }),
  }).catch(() => {});
}
