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
- `webServer`: serve `dist/` via `astro preview` on a **dedicated port 4322**
  (avoids colliding with a running `astro dev` on 4321). Command is
  **CI-aware to avoid a double build**:
  `process.env.CI ? 'npm run preview -- --port 4322' : 'npm run build && npm run preview -- --port 4322'`.
  In CI the workflow owns the single `npm run build`; locally the config
  builds. `reuseExistingServer: false` (never silently reuse a dev server —
  the goal is the faithful production surface, not HMR output). `timeout`
  ~120s to cover a local build.
- This serves `dist/` — real View Transitions, real consent gating, Pagefind
  indexed, and the **meta-CSP fallback** present (`astro preview` serves the
  `'unsafe-inline'` meta tag from `SEOHead.astro`, *not* the strict edge
  worker CSP — accurate framing, not a blocker).
- `baseURL` from `process.env.E2E_BASE_URL ?? 'http://localhost:4322'` so the
  same specs can point at a running preview locally or the CI server.
- Projects: `chromium` (desktop) always; `mobile-chromium` (Pixel 5 viewport)
  runs only in the full/nightly run. PR gate = desktop Chromium only.
- Test dir: `e2e/`. Reporter: `list` locally, `html` + `github` in CI.
- `.gitignore`: `playwright-report/`, `test-results/`, `/playwright/.cache/`.

### Fixtures (`e2e/fixtures.ts`)

- `clearConsent(page)` / `acceptConsent(page)` — seed/clear the consent
  localStorage key. The key is **`adrianwedd_consent`** (verified hardcoded in
  `ConsentBanner.astro`, `Analytics.astro:23`, `Transparency.tsx:11`,
  `Personalisation.tsx`, `404.astro`). Hardcode the verified key in the
  fixture — do **not** scrape Astro source at test time. (Extracting a shared
  `CONSENT_KEY` constant across those 5 files is a worthwhile follow-up but is
  out of scope for this test PR — scope creep into product code.)
- `expectNoVtReload(page, action)` — the core VT-lifecycle assertion, using
  **two signals** because a `window`-stamped flag alone can survive a BFCache
  restore (false negative, esp. on `back()`):
  1. stamp `window.__vtProbe` before the action and assert it survives (no hard
     document reload), AND
  2. assert `performance.getEntriesByType('navigation').length` did **not**
     increase across the hop (a real document navigation adds an entry; a VT
     `swap` does not).
  Combined, these distinguish a genuine VT swap from both a hard reload and a
  BFCache restore.

### Specs

Tagged `@smoke` run in the PR gate; untagged run nightly/full only.

**`e2e/vt-navigation.spec.ts` (`@smoke`)**
- home → blog index → a blog post → back; **discover the post link
  dynamically** (`page.locator('a[href*="/blog/"]').first()`) — never hardcode
  a slug (posts get drafted/renamed). Each hop asserts `expectNoVtReload` and
  that the `.light`/dark theme class set before the hop is still present after
  (theme persistence across swap).
- asserts the header/theme-toggle still responds after a swap (delegated
  listeners survived, not duplicated).
- Scope note: this guards the **global** VT lifecycle (header/theme). Page-local
  `astro:after-swap` re-init (blog tag toggle, project/gallery/search filters,
  audio controls) is covered by the nightly specs below, not the smoke gate.

**`e2e/consent.spec.ts` (`@smoke`)**
- fresh session (consent cleared): assert no request to **googletagmanager.com,
  gtag, pagead2.googlesyndication.com (AdSense), or LinkedIn** origins fires
  before consent (network interception + assert-empty). AdSense is loaded on
  consent grant too (`Analytics.astro:62`), so it belongs in the interception
  set.
- after `acceptConsent`: assert a **googletagmanager.com** request now fires.
  Guards the "no tracking before consent" invariant.
- **Build-env dependency (critical):** `Analytics.astro:16` bakes
  `PUBLIC_GA_MEASUREMENT_ID` at build time and `loadGA4()` early-returns on an
  empty ID. The `e2e.yml` build step (and the local `webServer` build) **must**
  set `PUBLIC_GA_MEASUREMENT_ID` to a dummy (e.g. `G-TESTE2E0000`) or this spec
  passes for the wrong reason (no GA script exists at all) and the
  fires-after-consent assertion can never pass. See CI section.

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

- `test:e2e` → `playwright test` (full suite)
- `test:e2e:smoke` → `playwright test --grep @smoke`
- `test:e2e:full` → `playwright test --grep-invert @smoke` (nightly-only specs)
- devDep: `@playwright/test` pinned to an exact version (reproducibility; it's a
  devDep so its transitive advisories don't hit the `--omit=dev` audit gate,
  but a bare local `npm audit` will show them — expected, not a regression).

### CI — `.github/workflows/e2e.yml` (NEW file)

- Triggers: `pull_request`, `workflow_dispatch`, nightly `schedule` (cron).
- PR job: `npm ci` → `npx playwright install --with-deps chromium` →
  `npm run build` **with `env: PUBLIC_GA_MEASUREMENT_ID: G-TESTE2E0000`**
  (self-contained; runs in parallel with deploy.yml's build, so no merge-time
  slowdown) → `npm run test:e2e:smoke` (the `webServer` reuses this build via
  the CI-aware `preview`-only command). Upload the HTML report as an artifact
  on failure.
- Nightly/dispatch job: `test:e2e:full`, both projects (adds `mobile-chromium`).
- **Required-status-check note:** flipping this workflow to a *required* check
  is a **branch-protection edit** — a STRATEGY.md escalation trigger done by the
  human in GitHub settings, outside the PR. The PR adds the workflow; it cannot
  self-require. Request it only after the workflow demonstrably runs green on
  its own PR (mirrors the Socket-check lesson in project memory).

## PR B — vitest unit suite (specified, built second)

- Root `vitest.config.ts` mirroring `worker/`'s style (node env; no jsdom
  needed for pure logic). Tests live in `test/` or co-located `*.test.ts`.
- Units:
  - **All five pure exports** of `src/lib/utils.ts`: `slug()` / `imageSlug()`
    (`.md`/`.mdx` stripping, alt-text slugification), plus `youtubeId()`,
    `ogSafeImage()`, `heroAltText()`. `youtubeId()` is **security-relevant** —
    its regex anchor prevents `?v=foo<script>` reaching the JSON-LD `embedUrl`;
    include XSS-shaped inputs.
  - `image-dimensions.ts` — PNG/JPEG/WebP/GIF header parsing. Two coupling
    facts to handle: (a) it resolves paths under `resolve(process.cwd(),
    'public')`, so commit tiny real fixtures under `public/test-fixtures/` and
    call `getImageDimensions('/test-fixtures/foo.png')`; (b) it has a
    module-level `cache` Map with no clear function — use a **unique path per
    test** (or add an exported `_clearCache()` test helper) so a second assertion
    on the same path actually re-parses instead of hitting the cache. Cover
    malformed-input handling.
  - Content-collection schema edge cases (description ≤160 boundary, required
    fields). **`content.config.ts` cannot be imported directly in vitest** — it
    pulls Astro virtual modules (`astro:content`, `astro/loaders`,
    `astro/zod`). Resolution: **extract the zod schema objects into
    `src/content/schemas.ts` (imports plain `zod` only), re-exported by
    `content.config.ts`**, and unit-test that module. Cover all **six**
    collections (blog, projects, gallery, audio, fixes, case-studies) or
    explicitly scope to a subset and say why — note `fixes`/`case-studies` have
    a required `category` and no `notebookAssets`. (Alternative if the extract
    is undesirable: `getViteConfig` from `astro/config`, but that pulls the full
    Astro plugin chain into the unit run — extract is preferred. These tests
    partially overlap `scripts/validate-content.js`, which stays the CI gate.)
- `package.json`: `test` → `vitest run` (site unit only — fast; **not** worker
  tests, which need `cd worker && npm ci`). Append `vitest run` to the existing
  `npm run verify` chain so unit regressions are caught locally pre-push.
- **CI wiring:** PR B adds a `vitest run` step to `e2e.yml` (or a sibling job)
  so the unit tests actually gate PRs — `deploy.yml` is untouched, so without
  this the unit suite would never run in CI.
- Document all three suites (site unit `npm test`, site e2e
  `npm run test:e2e:smoke`, worker `test:worker`/`test:csp`) in CLAUDE.md, and
  note this suite is **additive to** `scripts/test-site.sh` (which covers
  build-output structure: CDN/RSS/sitemap/OG/CSP) with no overlap — E2E covers
  runtime behavior, `test-site.sh` covers artifacts, vitest covers pure logic.

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
- New `.ts` files (`playwright.config.ts`, `vitest.config.ts`, `e2e/*.spec.ts`,
  `test/*.test.ts`) pass `npm run lint` and `npm run format:check` — confirm the
  existing `eslint .` / Prettier globs cover `e2e/` and `test/`, adding
  `files`/`ignores` entries if not.
