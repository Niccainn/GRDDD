/**
 * Smoke: post-auth landing.
 *
 * Catches the redirect-loop class of bug that took 4 PRs to unwind
 * (#31, #37, #40, #43). Signing in MUST land users on /dashboard,
 * not the env page, and /dashboard MUST render the home content.
 *
 * Without this test, the next time someone changes a redirect rule,
 * the wrong destination ships silently again.
 */

import { test, expect } from '@playwright/test';
import { signInAsDemo } from './fixtures';

test.describe('post-auth landing', () => {
  test('sign-in lands on /dashboard with home content', async ({ page }) => {
    await signInAsDemo(page);

    // Demo sign-in creates a new identity that hasn't completed
    // onboarding. /sign-in for a non-onboarded user → /welcome.
    // We deliberately go to /dashboard direct to bypass the
    // onboarding gate and verify the home renders.
    await page.goto('/dashboard');

    // The greeting renders one of the time-keyed prefixes. h1 is
    // structured as <span>Greeting</span> + name button.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /good (morning|afternoon|evening)/i,
    );
  });

  test('/dashboard does not redirect to env page (regression: PR #43)', async ({ page }) => {
    await signInAsDemo(page);

    // Navigate first so page.url() is a real URL — addCookies()
    // rejects domain/path pairs derived from about:blank, and using
    // the `url` form needs a non-empty origin.
    await page.goto('/');

    // Set the cookie that earlier middleware used to bounce
    // /dashboard → /environments/<slug>. PR #43 removed the
    // redirect; this test guards it from coming back.
    await page.context().addCookies([
      {
        name: 'grid_env_slug',
        value: 'fake-trap-env',
        url: page.url(),
      },
    ]);

    await page.goto('/dashboard');

    // URL must still be /dashboard, not /environments/fake-trap-env
    expect(new URL(page.url()).pathname).toBe('/dashboard');
  });
});
