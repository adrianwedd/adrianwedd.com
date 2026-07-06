import { defineConfig, devices } from '@playwright/test';

const PORT = 4322;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// In CI the workflow runs `npm run build` once, so the server only needs to
// `preview`. Locally we build then preview. Never reuse a running dev server —
// the smoke suite must exercise the production build, not HMR output.
const webServerCommand = process.env.CI
  ? `npm run preview -- --port ${PORT}`
  : `npm run build && npm run preview -- --port ${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: webServerCommand,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 180_000,
      },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } },
  ],
});
