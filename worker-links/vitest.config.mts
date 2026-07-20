import { defineConfig } from 'vitest/config';

// Scoped to this worker's own tests so the repo-root config (which targets
// test/unit/**/*.spec.ts for the Astro site) doesn't apply here.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
