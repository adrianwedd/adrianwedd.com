import { defineConfig, devices } from '@playwright/test';

const PORT = 4322;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// In CI the workflow runs `npm run build` once, so the server only needs to
// `preview`. Locally we build then preview. Never reuse a running dev server —
// the smoke suite must exercise the production build, not HMR output.
// ASTRO_PREVIEW_BACKGROUND: Astro 7 detects AI-agent environments (via
// am-i-vibing) and silently daemonises `astro preview`, exiting the foreground
// process — Playwright then reports "Process from config.webServer exited
// early". Setting the env var suppresses the auto-detection so preview stays
// in the foreground. Harmless in CI, where no agent env vars are present.
const webServerCommand = process.env.CI
  ? `ASTRO_PREVIEW_BACKGROUND=1 npm run preview -- --port ${PORT}`
  : `npm run build && ASTRO_PREVIEW_BACKGROUND=1 npm run preview -- --port ${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    // ScrollReveal animates every revealed block over 0.5s (opacity + a
    // translateY/scale transform, global.css:348). Playwright scrolls a target
    // into view, the IntersectionObserver fires, and the element is still
    // moving when the click lands — "element is not stable", then the hit test
    // resolves to whatever is underneath. On CI's slower CPU that loops to
    // timeout; locally it usually wins the race, which is why it read as a
    // mobile-only nightly flake. The site already disables the animation
    // entirely under prefers-reduced-motion (global.css:88 and :392), so asking
    // for it removes the race without stubbing anything out — and exercises a
    // real supported user mode rather than a synthetic one.
    //
    // Set via contextOptions, not as a bare `use` key: `reducedMotion` appears
    // only inside a doc comment in @playwright/test 1.55.1's test.d.ts, so the
    // top-level form does not typecheck here.
    contextOptions: { reducedMotion: 'reduce' },
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
    // Nightly-only (the @smoke PR gate runs chromium alone). NOTE: at the
    // Pixel 5 viewport the header nav collapses behind a hamburger, so any
    // nightly spec that clicks a header link (e.g. a[href="/blog/"]) will flake
    // here only — navigate via page.goto() or in-content elements instead.
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } },
  ],
});
