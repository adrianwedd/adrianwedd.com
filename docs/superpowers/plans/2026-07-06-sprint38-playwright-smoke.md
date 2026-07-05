# Sprint 38 PR A — Playwright Smoke Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Playwright E2E smoke suite that runs against the built site and gates PRs in <3 min, so a View-Transitions-lifecycle regression can no longer land silently.

**Architecture:** Playwright serves the production build (`dist/` via `astro preview` on port 4322) and drives Chromium through the repo's real VT/consent/theme behavior. A new `e2e.yml` workflow builds the site (with a dummy GA id) and runs the `@smoke`-tagged subset on PRs; the full suite runs on nightly/dispatch. No change to `deploy.yml`.

**Tech Stack:** `@playwright/test` (pinned), Astro 6 `astro preview`, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-07-06-sprint38-test-foundation-design.md`

## Global Constraints

- **Do NOT edit `.github/workflows/deploy.yml`, branch protection, or `.lychee.toml`** — STRATEGY.md escalation triggers. E2E CI is a NEW `e2e.yml` file.
- Test tooling is `devDependencies` only; no site runtime deps.
- Consent localStorage key is **`adrianwedd_consent`** (verified); state shape `{ analytics: boolean, personalisation: boolean, timestamp: number }`.
- Accept-all button: `#consent-accept-all`. Banner: `#consent-banner`.
- Theme: toggled via `.theme-toggle` button; `.light` class on `<html>`; localStorage key `theme`.
- `PUBLIC_GA_MEASUREMENT_ID` is baked at build time (`Analytics.astro:16`); `loadGA4()` early-returns on empty. The e2e build MUST set it to `G-TESTE2E0000` or consent assertions can't pass.
- Preview port is **4322** (never 4321 — avoids dev-server collision); `reuseExistingServer: false`.
- Smoke subset (`@smoke`) must stay <3 min wall-clock; PR gate = desktop Chromium only.
- New `.ts` files must pass `npm run lint` (flat ESLint, astro plugin) and `npm run format:check` (Prettier).
- Commit trailer on every commit: `Claude-Session: https://claude.ai/code/session_01Lm2dtTcKC99rCGfqj2bw95`

---

### Task 1: Install Playwright, config, scripts, gitignore

**Files:**
- Modify: `package.json` (devDependencies + scripts)
- Create: `playwright.config.ts`
- Modify: `.gitignore`
- Modify: `eslint.config.js` (ignore Playwright output dirs)

**Interfaces:**
- Produces: `playwright.config.ts` exporting a config with `testDir: 'e2e'`, `baseURL` from `E2E_BASE_URL ?? 'http://localhost:4322'`, `webServer` (CI-aware, port 4322, `reuseExistingServer: false`), projects `chromium` + `mobile-chromium`. npm scripts `test:e2e`, `test:e2e:smoke`, `test:e2e:full`.

- [ ] **Step 1: Install @playwright/test pinned + browser**

Run:
```bash
npm install -D --save-exact @playwright/test@1.55.0
npx playwright install chromium
```
Expected: `@playwright/test` appears in `devDependencies` with an exact version (no `^`); Chromium downloads.

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
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
```

- [ ] **Step 3: Add npm scripts to `package.json`**

Add to `"scripts"`:
```json
"test:e2e": "playwright test",
"test:e2e:smoke": "playwright test --project=chromium --grep @smoke",
"test:e2e:full": "playwright test --grep-invert @smoke"
```

- [ ] **Step 4: Update `.gitignore`**

Append:
```
# Playwright
/playwright-report/
/test-results/
/playwright/.cache/
```

- [ ] **Step 5: Ignore Playwright output in ESLint**

In `eslint.config.js`, add the report/results dirs to the existing `ignores` array:
```js
ignores: ['dist/', '.astro/', 'public/pagefind/', 'scripts/notebooklm/', 'playwright-report/', 'test-results/'],
```

- [ ] **Step 6: Verify lint + format clean, then commit**

Run:
```bash
npm run lint && npx prettier --check 'playwright.config.ts'
```
Expected: no errors. If Prettier flags `playwright.config.ts`, run `npx prettier --write playwright.config.ts`.

```bash
git add package.json package-lock.json playwright.config.ts .gitignore eslint.config.js
git commit -m "test(e2e): scaffold Playwright — config, scripts, gitignore

Claude-Session: https://claude.ai/code/session_01Lm2dtTcKC99rCGfqj2bw95"
```

---

### Task 2: Shared fixtures

**Files:**
- Create: `e2e/fixtures.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `clearConsent(page: Page): Promise<void>` — removes `adrianwedd_consent` from localStorage.
  - `acceptConsent(page: Page): Promise<void>` — clicks `#consent-accept-all` and waits for the banner to hide.
  - `expectNoVtReload(page: Page, action: () => Promise<void>): Promise<void>` — asserts a VT swap (not a hard reload or BFCache restore) happened across `action`.
  - `TRACKER_ORIGINS: string[]` — origins that must not be requested before consent.

- [ ] **Step 1: Write `e2e/fixtures.ts`**

```ts
import { expect, type Page } from '@playwright/test';

// Verified hardcoded across ConsentBanner.astro, Analytics.astro:23,
// Transparency.tsx:11, Personalisation.tsx, 404.astro. Do not scrape source.
export const CONSENT_KEY = 'adrianwedd_consent';

// Loaded only after consent (Analytics.astro): GA4/gtag, AdSense, LinkedIn.
export const TRACKER_ORIGINS = [
  'www.googletagmanager.com',
  'pagead2.googlesyndication.com',
  'snap.licdn.com',
  'px.ads.linkedin.com',
];

export async function clearConsent(page: Page): Promise<void> {
  await page.evaluate((key) => localStorage.removeItem(key), CONSENT_KEY);
}

export async function acceptConsent(page: Page): Promise<void> {
  await page.locator('#consent-accept-all').click();
  await expect(page.locator('#consent-banner')).toBeHidden();
}

// Proves a View-Transitions swap occurred, distinguishing it from BOTH a hard
// document reload (window state destroyed) and a BFCache restore (window state
// preserved but a navigation entry is added). Two signals are required because
// the window probe alone yields a false negative on BFCache back().
export async function expectNoVtReload(
  page: Page,
  action: () => Promise<void>,
): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __vtProbe?: number }).__vtProbe = 42;
  });
  const before = await page.evaluate(
    () => performance.getEntriesByType('navigation').length,
  );
  await action();
  const probe = await page.evaluate(
    () => (window as unknown as { __vtProbe?: number }).__vtProbe,
  );
  const after = await page.evaluate(
    () => performance.getEntriesByType('navigation').length,
  );
  expect(probe, 'window state should survive a VT swap (no hard reload)').toBe(42);
  expect(after, 'no new navigation entry — a VT swap, not a document nav').toBe(before);
}
```

- [ ] **Step 2: Verify it type-checks and lints**

Run:
```bash
npx tsc --noEmit e2e/fixtures.ts 2>/dev/null; npm run lint
```
Expected: `npm run lint` reports 0 errors on `e2e/fixtures.ts`. (Type errors surface when specs import it in later tasks; a bare `tsc` on one file may complain about libs — the authoritative gate is lint + the specs compiling.)

- [ ] **Step 3: Commit**

```bash
git add e2e/fixtures.ts
git commit -m "test(e2e): shared consent + VT-reload fixtures

Claude-Session: https://claude.ai/code/session_01Lm2dtTcKC99rCGfqj2bw95"
```

---

### Task 3: VT navigation smoke spec

**Files:**
- Create: `e2e/vt-navigation.spec.ts`

**Interfaces:**
- Consumes: `expectNoVtReload` from `e2e/fixtures.ts`.

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';
import { expectNoVtReload } from './fixtures';

test('@smoke VT navigation preserves window + theme, no full reload', async ({ page }) => {
  await page.goto('/');

  // Force a known theme so we can assert it persists across the swap.
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.add('light');
  });

  // home -> blog index (VT swap, window state must survive)
  await expectNoVtReload(page, async () => {
    await page.locator('a[href$="/blog/"], a[href="/blog"]').first().click();
    await page.waitForURL('**/blog/**');
  });
  await expect(page.locator('html')).toHaveClass(/light/);

  // blog index -> first real post (discover slug dynamically — never hardcode)
  const firstPost = page.locator('a[href*="/blog/"]').filter({ hasNot: page.locator('[href$="/blog/"]') }).first();
  await expectNoVtReload(page, async () => {
    await firstPost.click();
    await page.waitForLoadState('networkidle');
  });
  await expect(page.locator('html')).toHaveClass(/light/);

  // back() -> still a VT restore, theme intact, header still interactive
  await expectNoVtReload(page, async () => {
    await page.goBack();
    await page.waitForURL('**/blog/**');
  });
  await expect(page.locator('html')).toHaveClass(/light/);
  // Delegated theme-toggle listener survived the swaps (not duplicated/dead):
  await page.locator('.theme-toggle').first().click();
  await expect(page.locator('html')).not.toHaveClass(/light/);
});
```

- [ ] **Step 2: Run against a local build to verify it passes**

Run:
```bash
npx playwright test e2e/vt-navigation.spec.ts --project=chromium
```
Expected: PASS. (Playwright's `webServer` builds and serves on 4322 automatically. If the blog-post locator finds no element, inspect the built `dist/blog/index.html` for the real anchor shape and adjust the selector — the intent is "the first link into an individual post".)

- [ ] **Step 3: Commit**

```bash
git add e2e/vt-navigation.spec.ts
git commit -m "test(e2e): VT navigation smoke — no full reload, theme persists

Claude-Session: https://claude.ai/code/session_01Lm2dtTcKC99rCGfqj2bw95"
```

---

### Task 4: Consent-gating smoke spec

**Files:**
- Create: `e2e/consent.spec.ts`

**Interfaces:**
- Consumes: `clearConsent`, `acceptConsent`, `TRACKER_ORIGINS` from `e2e/fixtures.ts`.

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';
import { acceptConsent, clearConsent, TRACKER_ORIGINS } from './fixtures';

test('@smoke no tracker requests before consent; GA4 fires after accept', async ({ page }) => {
  const trackerHits: string[] = [];
  page.on('request', (req) => {
    const host = new URL(req.url()).hostname;
    if (TRACKER_ORIGINS.includes(host)) trackerHits.push(host);
  });

  await page.goto('/');
  await clearConsent(page);
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Invariant: nothing tracking-related before the user opts in.
  expect(trackerHits, `no trackers pre-consent, saw: ${trackerHits.join(',')}`).toEqual([]);

  // Accept, then GA4 must load. Requires the build to bake a real-shaped
  // PUBLIC_GA_MEASUREMENT_ID (G-TESTE2E0000) — see e2e.yml / Global Constraints.
  const ga4 = page.waitForRequest(/googletagmanager\.com\/gtag\/js/, { timeout: 10_000 });
  await acceptConsent(page);
  await ga4;
});
```

- [ ] **Step 2: Run with the dummy GA id set (mirrors CI)**

Run:
```bash
PUBLIC_GA_MEASUREMENT_ID=G-TESTE2E0000 npx playwright test e2e/consent.spec.ts --project=chromium
```
Expected: PASS. (The env var must be present for the `webServer`'s local `npm run build`. Without it, `waitForRequest` times out — the exact failure the spec's CI env guards against.)

- [ ] **Step 3: Commit**

```bash
git add e2e/consent.spec.ts
git commit -m "test(e2e): consent gating smoke — no trackers pre-consent, GA4 after

Claude-Session: https://claude.ai/code/session_01Lm2dtTcKC99rCGfqj2bw95"
```

---

### Task 5: Theme-persistence smoke spec

**Files:**
- Create: `e2e/theme.spec.ts`

**Interfaces:**
- Consumes: `expectNoVtReload` from `e2e/fixtures.ts`.

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';
import { expectNoVtReload } from './fixtures';

test('@smoke theme toggle persists across VT swap and reload', async ({ page }) => {
  await page.goto('/');

  // Normalise to dark, then toggle to light.
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.remove('light');
  });
  await page.locator('.theme-toggle').first().click();
  await expect(page.locator('html')).toHaveClass(/light/);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');

  // Persists across a VT swap.
  await expectNoVtReload(page, async () => {
    await page.locator('a[href$="/blog/"], a[href="/blog"]').first().click();
    await page.waitForURL('**/blog/**');
  });
  await expect(page.locator('html')).toHaveClass(/light/);

  // Persists across a hard reload (no-flash inline script reads localStorage).
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/light/);
});
```

- [ ] **Step 2: Run to verify it passes**

Run:
```bash
npx playwright test e2e/theme.spec.ts --project=chromium
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/theme.spec.ts
git commit -m "test(e2e): theme persistence smoke — across VT swap and reload

Claude-Session: https://claude.ai/code/session_01Lm2dtTcKC99rCGfqj2bw95"
```

---

### Task 6: Nightly-only specs (search, blog filter, pagination, audio)

**Files:**
- Create: `e2e/search.spec.ts`, `e2e/blog-filters.spec.ts`, `e2e/pagination.spec.ts`, `e2e/audio-player.spec.ts`

**Interfaces:**
- Consumes: nothing beyond Playwright. These are **untagged** (no `@smoke`) so they run only via `test:e2e:full`.

- [ ] **Step 1: Write `e2e/search.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('Pagefind search returns a result linking to a real page', async ({ page }) => {
  await page.goto('/search/');
  const input = page.locator('input[type="search"], input[type="text"]').first();
  await input.fill('astro');
  // Pagefind loads its WASM index lazily; wait for a result anchor.
  const result = page.locator('a[href^="/"]').filter({ hasText: /.+/ });
  await expect(result.first()).toBeVisible({ timeout: 15_000 });
});
```

- [ ] **Step 2: Write `e2e/blog-filters.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('blog tag filter changes the visible post set', async ({ page }) => {
  await page.goto('/blog/');
  const tag = page.locator('[data-tag], a[href*="/blog/tag/"]').first();
  await expect(tag).toBeVisible();
  const before = await page.locator('article, li a[href*="/blog/"]').count();
  await tag.click();
  await page.waitForLoadState('networkidle');
  const after = await page.locator('article, li a[href*="/blog/"]').count();
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThanOrEqual(before);
});
```

- [ ] **Step 3: Write `e2e/pagination.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('index pagination advances to a different listing', async ({ page }) => {
  await page.goto('/blog/');
  const next = page.locator('a[rel="next"], a[href*="/2/"]').first();
  const hasNext = await next.count();
  test.skip(hasNext === 0, 'not enough content for a second page');
  const firstBefore = await page.locator('a[href*="/blog/"]').first().getAttribute('href');
  await next.click();
  await page.waitForLoadState('networkidle');
  const firstAfter = await page.locator('a[href*="/blog/"]').first().getAttribute('href');
  expect(firstAfter).not.toBe(firstBefore);
});
```

- [ ] **Step 4: Write `e2e/audio-player.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('audio player toggles play/pause state', async ({ page }) => {
  await page.goto('/audio/');
  const firstEpisode = page.locator('a[href*="/audio/"]').first();
  await firstEpisode.click();
  await page.waitForLoadState('networkidle');
  const playBtn = page.locator('[aria-label*="Play" i], button:has-text("Play")').first();
  await expect(playBtn).toBeVisible({ timeout: 10_000 });
  await playBtn.click();
  // After pressing play the control should offer pause (state changed).
  await expect(
    page.locator('[aria-label*="Pause" i], button:has-text("Pause")').first(),
  ).toBeVisible({ timeout: 10_000 });
});
```

- [ ] **Step 5: Run the full (nightly) suite locally to shake out selectors**

Run:
```bash
npx playwright test --project=chromium --grep-invert @smoke
```
Expected: PASS, or a documented `test.skip` for pagination if content is thin. If a selector misses, open the built page in `dist/` and adjust to the real markup — the assertion intent per test is fixed; only selectors adapt. Audio may be slow due to R2 media; that's why it's nightly-only.

- [ ] **Step 6: Commit**

```bash
git add e2e/search.spec.ts e2e/blog-filters.spec.ts e2e/pagination.spec.ts e2e/audio-player.spec.ts
git commit -m "test(e2e): nightly specs — search, blog filter, pagination, audio

Claude-Session: https://claude.ai/code/session_01Lm2dtTcKC99rCGfqj2bw95"
```

---

### Task 7: CI workflow `e2e.yml`

**Files:**
- Create: `.github/workflows/e2e.yml`

**Interfaces:**
- Consumes: `test:e2e:smoke`, `test:e2e:full` scripts from Task 1.

- [ ] **Step 1: Write `.github/workflows/e2e.yml`**

```yaml
name: E2E

on:
  pull_request:
  workflow_dispatch:
  schedule:
    - cron: '0 14 * * *' # nightly ~00:00 AEST

concurrency:
  group: e2e-${{ github.ref }}
  cancel-in-progress: true

jobs:
  smoke:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    env:
      CI: 'true'
      PUBLIC_GA_MEASUREMENT_ID: G-TESTE2E0000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:e2e:smoke
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  full:
    if: github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      CI: 'true'
      PUBLIC_GA_MEASUREMENT_ID: G-TESTE2E0000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:e2e:full
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report-full
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Validate the workflow YAML**

Run:
```bash
npx --yes yaml-lint .github/workflows/e2e.yml 2>/dev/null || node -e "require('js-yaml') && console.log('has js-yaml')" 2>/dev/null || python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/e2e.yml')); print('yaml ok')"
```
Expected: `yaml ok` (or equivalent). At minimum, confirm the file parses as YAML.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/e2e.yml
git commit -m "ci(e2e): add e2e.yml — smoke on PRs, full on nightly/dispatch

Do NOT edit deploy.yml; this is a standalone workflow. Making it a required
check is a branch-protection change done by the human after it proves green.

Claude-Session: https://claude.ai/code/session_01Lm2dtTcKC99rCGfqj2bw95"
```

---

### Task 8: Docs + full smoke gate timing check

**Files:**
- Modify: `CLAUDE.md` (test-command docs)

- [ ] **Step 1: Time the smoke gate end to end**

Run:
```bash
time npm run test:e2e:smoke
```
Expected: PASS in well under 3 minutes (build + 3 smoke specs, Chromium only). Record the wall-clock. If it exceeds ~2.5 min, note which spec dominates for a later split.

- [ ] **Step 2: Document the suites in `CLAUDE.md`**

Under the existing "Commands" block near the top, add:
```
npm run test:e2e         # full Playwright suite (build + preview on :4322)
npm run test:e2e:smoke   # @smoke subset — the PR gate (<3 min, Chromium)
npm run test:e2e:full    # nightly-only specs (search, filters, pagination, audio)
```
And add a sentence to the testing note: "The Astro site now has a Playwright E2E suite (`e2e/`), run in CI by `.github/workflows/e2e.yml` — smoke on PRs, full nightly. It serves the production build via `astro preview` on port 4322; the build must set `PUBLIC_GA_MEASUREMENT_ID` (CI uses a dummy `G-TESTE2E0000`) for the consent spec."

- [ ] **Step 3: Verify lint/format on all new + changed files**

Run:
```bash
npm run lint && npm run format:check
```
Expected: 0 errors. Prettier-write any flagged file, re-check.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document Playwright E2E suites and the PR smoke gate

Claude-Session: https://claude.ai/code/session_01Lm2dtTcKC99rCGfqj2bw95"
```

---

## Out of scope (this PR)

- vitest unit suite, root `npm test`, `src/content/schemas.ts` extract → **PR B**.
- Flipping the E2E check to *required* → human branch-protection edit after green.
- Firefox/WebKit projects, visual regression, component-render tests → YAGNI.
