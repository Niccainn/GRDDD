/**
 * Smoke: list pages don't crash on empty data.
 *
 * Catches the .map / .length crash class that hit four widgets in
 * PR #33 and forced a 14-site safe-fetch sweep in PRs #38/#39. A
 * fresh authed user has zero tasks, zero goals, zero docs — every
 * list page must handle that gracefully without firing the page-
 * level error boundary.
 *
 * Specifically guards against:
 *   "TypeError: environments.map is not a function"
 *   "TypeError: Cannot read properties of undefined (reading 'length')"
 *   "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
 *
 * which all rendered the global error boundary ("Something went
 * wrong") and turned into 4–6-PR fix chains.
 */

import { test, expect } from '@playwright/test';
import { signInAsDemo } from './fixtures';

const PAGES = [
  { path: '/dashboard',   label: 'dashboard' },
  { path: '/tasks',       label: 'tasks' },
  { path: '/goals',       label: 'goals' },
  { path: '/docs',        label: 'docs' },
  { path: '/inbox',       label: 'inbox' },
  { path: '/calendar',    label: 'calendar' },
  { path: '/templates',   label: 'templates' },
  { path: '/systems',     label: 'systems' },
];

test.describe('list pages render cleanly with no data', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsDemo(page);
  });

  for (const { path, label } of PAGES) {
    test(`${label} (${path}) — no error boundary`, async ({ page }) => {
      // Track console errors so a failing fetch.then(r => r.json())
      // doesn't pass silently while still rendering the boundary.
      const consoleErrors: string[] = [];
      page.on('pageerror', err => consoleErrors.push(err.message));

      await page.goto(path);

      // Page-level error boundary text. If this is on the page, the
      // page crashed during render — that's the bug class we're
      // guarding.
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
        timeout: 5000,
      });

      // SyntaxError from .json() on a non-JSON 5xx body is the most
      // common failure mode this guards against.
      const fatalErrors = consoleErrors.filter(
        e => /SyntaxError|TypeError.*\.(map|length)/.test(e),
      );
      expect(
        fatalErrors,
        `Console emitted fatal errors on ${path}:\n${fatalErrors.join('\n')}`,
      ).toHaveLength(0);
    });
  }
});
