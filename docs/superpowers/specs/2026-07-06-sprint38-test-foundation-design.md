# Sprint 38 — Test Foundation for the Astro Site

Date: 2026-07-06
Roadmap: `docs/ROADMAP-2026-H2.md` § Sprint 38
Exit criteria (roadmap): PR gate runs smoke tests in <3 min; a VT-lifecycle
regression can no longer land silently.

## Intent

End the "no test suite" era for the Astro site. The View-Transitions script
lifecycle (is:inline + sentinel + event-delegation + `astro:after-swap`) is the
repo's recurring regression class — it broke main more than once — so it is
covered first and most thoroughly. Unit-level pure logic (`slug()`,
`imageSlug()`, `image-dimensions.ts`) gets fast vitest coverage.

Delivered as **two PRs by tool**:

- **PR A — Playwright smoke suite + CI gate** (this spec's primary scope)
- **PR B — vitest unit suite + root `npm test` + docs**

Both are specified here; PR A is built first.

## Constraints & guardrails (from STRATEGY.md)

- **Do not edit `deploy.yml` gates** — that is an escalation trigger. E2E CI
  lands as a *new* workflow (`e2e.yml`), not a step inside `deploy.yml`.
- No new runtime deps on the site; test tooling is `devDependencies` only.
- Workers are out of scope — they already have their own vitest suites.
- The smoke subset in the PR gate must stay **<3 min** wall-clock.

## PR A — Playwright smoke suite

### Harness

- `playwright.config.ts` at repo root.
- `webServer`: command `npm run build && npm run preview`, `url`
  `http://localhost:4321`, `reuseExistingServer: !process.env.CI`,
  generous `timeout` for the build (~120s). This serves `dist/` via
  `astro preview` — the faithful production surface: real View Transitions,
  real consent gating, Pagefind indexed, meta-CSP present.
- `baseURL` from `process.env.E2E_BASE_URL ?? 'http://localhost:4321'` so the
  same specs can point at a running preview locally or the CI-started server.
- Projects: `chromium` (desktop) always; `mobile-chromium` (Pixel 5 viewport)
  runs only in the full/nightly run. PR gate = desktop Chromium only.
- Test dir: `e2e/`. Reporter: `list` locally, `html` + `github` in CI.
- `.gitignore`: `playwright-report/`, `test-results/`, `/playwright/.cache/`.

### Fixtures (`e2e/fixtures.ts`)

- `clearConsent(page)` / `acceptConsent(page)` — seed/clear the consent
  localStorage key the ConsentBanner uses; assert against the actual key name
  read from `ConsentBanner.astro` at implementation time.
- `expectNoFullReload(page, action)` — stamps `window.__vtProbe` before the
  action, runs the navigation, asserts the probe survives (proves a VT swap,
  not a document reload). This is the core VT-lifecycle assertion.

### Specs

Tagged `@smoke` run in the PR gate; untagged run nightly/full only.

**`e2e/vt-navigation.spec.ts` (`@smoke`)**
- home → blog index → a blog post → back; each hop asserts
  `expectNoFullReload` and that the `.light`/dark theme class set before the
  hop is still present after (theme persistence across swap).
- asserts the header/theme-toggle still responds after a swap (delegated
  listeners survived, not duplicated).

**`e2e/consent.spec.ts` (`@smoke`)**
- fresh session (consent cleared): assert no request to GA4 / `gtag` /
  LinkedIn origins fires before consent (network interception + assert-empty).
- after `acceptConsent`: assert the GA4 request now fires. Guards the
  "no tracking before consent" invariant.

**`e2e/theme.spec.ts` (`@smoke`)**
- toggle theme → navigate (VT swap) → assert persisted; reload → assert
  persisted (localStorage + no-flash inline script).

**Nightly / full (untagged):**
- `e2e/search.spec.ts` — Pagefind: type a known term, assert a result links
  to a real page.
- `e2e/blog-filters.spec.ts` — blog tag filter toggles post visibility.
- `e2e/pagination.spec.ts` — index pagination next/prev changes the listing.
- `e2e/audio-player.spec.ts` — audio player play → pause updates UI state.

### package.json scripts

- `test:e2e` → `playwright test`
- `test:e2e:smoke` → `playwright test --grep @smoke`
- devDep: `@playwright/test` (pinned).

### CI — `.github/workflows/e2e.yml` (NEW file)

- Triggers: `pull_request`, `workflow_dispatch`, nightly `schedule` (cron).
- PR job: `npm ci` → `npx playwright install --with-deps chromium` →
  `npm run build` (self-contained; runs in parallel with deploy.yml's build,
  so no merge-time slowdown) → `npm run test:e2e:smoke`. Upload the HTML
  report as an artifact on failure.
- Nightly/dispatch job: full suite, both projects.
- Made a **required status check** only after it demonstrably runs green on a
  PR (do not require a check that hasn't proven stable — mirrors the
  Socket-check lesson in project memory).

## PR B — vitest unit suite (specified, built second)

- Root `vitest.config.ts` mirroring `worker/`'s style (node env; no jsdom
  needed for pure logic). Tests live in `test/` or co-located `*.test.ts`.
- Units:
  - `slug()` / `imageSlug()` from `src/lib/utils.ts` — `.md`/`.mdx` stripping,
    alt-text slugification edge cases.
  - `image-dimensions.ts` — PNG/JPEG/WebP/GIF header parsing against small
    committed fixtures; malformed-input handling.
  - content-collection schema edge cases (description length boundary, required
    fields) — validate the zod schemas in `content.config.ts`.
- Root `npm test` aggregator that runs vitest (site) and documents the worker
  suites (`test:worker`, `test:csp`) alongside it in CLAUDE.md.
- Document the three suites (site unit, site e2e, worker) in CLAUDE.md.

## Non-goals (YAGNI)

- No visual-regression / screenshot diffing.
- No cross-browser Firefox/WebKit in the PR gate (Chromium only; add later if a
  browser-specific regression appears).
- No component-level Astro rendering tests — smoke E2E covers behavior, vitest
  covers pure logic; the middle layer isn't worth the setup cost yet.
- No change to `deploy.yml`, branch protection, or `.lychee.toml`.

## Verification

- `npm run test:e2e:smoke` green locally against a fresh build.
- e2e.yml runs green on the PR itself before requesting it be required.
- Existing `npm run verify` still passes (no regression to build/gates).
