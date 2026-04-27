/**
 * Playwright fixtures — shared authentication helpers.
 *
 * Why this exists:
 *   Most of the bugs that crashed this product over the past few
 *   weeks were authed-only — login redirect loops, sidebar Home
 *   visibility in env context, sample-data banner gating, list-page
 *   data crashes. None of those are reachable from a guest browser.
 *
 *   The /api/auth/demo endpoint creates a fresh sandbox identity +
 *   session in one POST. It's gated by `isDemoEnabled()` (NODE_ENV
 *   !== production OR GRID_ENABLE_DEMO=1). CI sets the flag.
 *
 *   This fixture wraps the call so smoke specs can sign in with one
 *   line of setup:
 *
 *     test.beforeEach(async ({ page }) => { await signInAsDemo(page); });
 */

import type { Page } from '@playwright/test';

export async function signInAsDemo(page: Page): Promise<void> {
  // POST /api/auth/demo creates an Identity + session. Cookies land
  // on the page's context automatically.
  const res = await page.request.post('/api/auth/demo');
  if (!res.ok()) {
    throw new Error(
      `signInAsDemo failed (${res.status()}). ` +
        `If running locally outside dev, set GRID_ENABLE_DEMO=1.`,
    );
  }
}
