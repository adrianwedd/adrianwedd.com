import { defineConfig } from 'vitest/config';

// Root unit-test runner. Scoped to `test/unit/` so it never picks up the
// Playwright specs in `e2e/` (those run under `@playwright/test`, not vitest)
// or the worker suites (`worker/`, `worker-csp/` have their own vitest configs).
export default defineConfig({
  test: {
    include: ['test/unit/**/*.spec.ts'],
    environment: 'node',
  },
});
