import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    // Exclude worktrees so each test isn't counted 5× and stale copies
    // in .claude/worktrees/* don't leak into CI results.
    exclude: [
      '.claude/**',
      '.next/**',
      'node_modules/**',
      'dist/**',
      'e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        '.claude/**',
        '.next/**',
        'node_modules/**',
        'prisma/**',
        'e2e/**',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
