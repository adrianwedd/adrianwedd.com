import { defineConfig, devices } from '@playwright/test';

/**
 * Undertow live-player playback matrix (issue adrianwedd/undertow-radio#534).
 *
 * Opt-in matrix for the public player at
 * https://adrianwedd.com/projects/undertow/. Unlike playwright.config.ts this
 * config deliberately has NO webServer: every project must exercise the real
 * deployed page with the real production CSP headers and the real station
 * endpoints at undertow.wtf — no preview server, no mocked endpoints, no
 * header simulation. Run it with:
 *
 *   UNDERTOW_MATRIX=1 npx playwright test -c playwright.undertow.config.ts
 *
 * The default playwright.config.ts never runs this spec: the spec itself
 * skips everything unless UNDERTOW_MATRIX=1, so the PR smoke gate stays
 * hermetic (preview server) and does not load production on every PR.
 *
 * It is a production-verification instrument, run on demand against live
 * PROD; it does not slot into the PR smoke gate.
 */
const PROD = 'https://adrianwedd.com/projects/undertow/';

// The spec skips itself unless this marker is set, so the default config
// (PR smoke gate) stays hermetic. Set it here so the opt-in config is
// self-contained: the marker is scoped to this process only.
process.env.UNDERTOW_MATRIX = '1';

export default defineConfig({
  testDir: 'e2e',
  // The matrix instruments — and only instruments — the Undertow live player.
  testMatch: /undertow-live\.spec\.ts/,
  timeout: 180_000,
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: PROD,
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
    // Fallback path: no MediaSource in a Chromium-class engine, which has no
    // native HLS, so the player must report 'unsupported' and offer the
    // station's own player.
    { name: 'chromium-no-mse', use: { ...devices['Desktop Chrome'] } },
    // Error recovery: the real stream is cut mid-playback for a bounded window
    // (route abort on the live playlist only — real endpoints, real headers),
    // and the player must return to Live.
    { name: 'chromium-outage-recovery', use: { ...devices['Desktop Chrome'] } },
    // Rapid Pause -> Play cycles must stay live and rejoin the live edge.
    { name: 'chromium-rapid-toggle', use: { ...devices['Desktop Chrome'] } },
  ],
});
