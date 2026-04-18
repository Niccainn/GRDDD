import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config. Run with `npm run test:e2e`.
 *
 * CI note: tests that need the Next dev server should use the
 * `webServer` block below so Playwright starts/stops it itself.
 * Override BASE_URL when pointing at a deployed preview (e.g.
 * vercel-generated PR URL).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Uncomment when expanding:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'mobile',  use: { ...devices['iPhone 14'] } },
  ],

  webServer: process.env.CI
    ? {
        command: 'npm run build && npm run start',
        port: 3000,
        timeout: 120_000,
        reuseExistingServer: false,
      }
    : {
        command: 'npm run dev',
        port: 3000,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
