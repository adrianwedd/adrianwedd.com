# Astro 7 migration receipt — 2026-09-05

Controller issue: [#586](https://github.com/adrianwedd/adrianwedd.com/issues/586). Migration PR: [#657](https://github.com/adrianwedd/adrianwedd.com/pull/657).

## Versions

|                          | before       | after          |
| ------------------------ | ------------ | -------------- |
| Astro                    | 6.4.8        | 7.3.1          |
| @astrojs/mdx             | 6.0.3        | 8.0.0          |
| @astrojs/preact          | 5.1.5        | 6.0.5          |
| @astrojs/markdown-remark | (transitive) | 7.3.0 (direct) |
| eslint-plugin-astro      | 1.x          | 3.1.0          |
| vite (override)          | 7.3.5        | 8.2.2          |
| node (build)             | 22           | 22 (unchanged) |

## SHAs

- Baseline (main before merge): `60cd97e`
- Migration branch tip at QA time: `048b720` (01acedd + the deploy.yml npm@11 audit swap)
- Merge commit: `9c75104`
- Deployed SHA (production): `9c75104` via deploy run [33937822263](https://github.com/adrianwedd/adrianwedd.com/actions/runs/33937822263) (successful at 2026-09-05 02:00 UTC)
- Post-merge e2e fix branch `fix/e2e-mobile-header-nav` (PR [#660](https://github.com/adrianwedd/adrianwedd.com/pull/660)): `e955c20` (codex A-fixes: missing import, scroll-reveal under no-preference) → `8122d85` → `f6ecdfc` (agy B-fix: `:visible` on vt-navigation:38) → `59f090d` (clickCard touch dispatch + A4/B4a comment corrections) → `5173bef` (two-mode tap-then-force, probe attached) → `175dd40` (audio Play button routed through clickCard). Merged as `579f6fa`.

## PR disposition

| PR                                  | disposition                                          |
| ----------------------------------- | ---------------------------------------------------- |
| #657 Astro 6→7                      | merged as 9c75104                                    |
| #638 Dependabot astro               | superseded by #657, closed with receipt              |
| #642 Dependabot @astrojs/mdx        | superseded by #657, closed with receipt              |
| #645 Dependabot @astrojs/preact     | superseded by #657, closed with receipt              |
| #643 Dependabot eslint-plugin-astro | superseded by #657, closed with receipt              |
| #621 (old oversized stats repair)   | closed as superseded before the migration (Gate 1)   |
| #615 (stats contradictions)         | closed via #656 before the migration (Gate 1)        |
| #644 #646 #651 #653 #639 #640 #622  | unrelated Dependabot updates — left open, NOT merged |

## Gate evidence

### Gate 0 — workspace preservation

Unrelated untracked OG-card work (`.og-cards-generated/`, `.og-cards/`, `.og-sources/`, `scripts/build-page-og-sources.mjs`, `scripts/crop-page-og-cards.mjs`, `scripts/generate-og-cards.mjs`, `scripts/generate-page-og-cards.sh`, `scripts/og-fonts/`, `verify-01acedd-home.png`) preserved byte-for-byte; never staged, modified, or absorbed. Post-merge `git status` re-verified.

### Gate 1 — #615 / #621

Closed truthfully before the migration: #615 closed via #656 (60cd97e date-frames the corpus figures and retires failurefirst.ai from render prompts); #621 closed as superseded by #656/#657.

### Gate 2 — migration scope

14 files, +1996/−888 at 048b720 (13 migration files + the deploy.yml npm@11 audit swap, see Gate 6), migration-scoped only: astro.config.mjs (`compressHTML: true` keeps Astro 6 HTML behaviour), package.json + lockfile, playwright.config.ts (`ASTRO_PREVIEW_BACKGROUND=1` stops Astro 7's preview auto-daemonization), 8 page templates capturing `const site = Astro.site; const pathname = Astro.url.pathname;` in frontmatter (Astro 7 removes the global `Astro` from template bodies), new e2e/vt-idempotence.spec.ts, .github/workflows/deploy.yml. #553 (image service migration) explicitly deferred — no opportunistic changes.

Post-migration sweep for latent template-body `Astro` globals (frontmatter-fence-aware scan of all 51 `.astro` files under `src/`, 291 content `.md`/`.mdx`, islands, libs): **0 of 42 `Astro.` references outside frontmatter**; no `<script>` body, `set:html` expression, or event-handler attribute references the global anywhere; the 8 touched templates' JSON-LD blocks resolve exclusively through the captured `site`/`pathname`/`pageUrl` consts; content files contain zero `<script>` tags. The only template-body occurrences of the word "Astro" are two JS comments, two HTML comments, one meta-content string, and colophon display text interpolating a captured const.

### Gate 3 — VT + analytics adversarial verification

- `src/components/Analytics.astro` (679 lines) verified line-by-line: `send_page_view: false` with manual pageview exactly once per `astro:after-swap`; `page_location` built as `origin + pathname` (query-free by construction); UTM/campaign/traffic attribution via sessionStorage `adrianwedd_attribution` surviving VT; `article_engaged` requires blog_post/project + ≥75% scroll + ≥60s with a single-fire guard; single-fire guards on cv_view / contact_intent / booking_intent / high_intent_transition; consent gate before any tracker.
- e2e/analytics-intent.spec.ts (@smoke): UTM survival across VT, single-fire high-intent events, query-free `page_location` asserted on every captured event, navigation still works with GA aborted.
- e2e/vt-idempotence.spec.ts (nightly, 422 lines): adversarial VT re-entry — duplicate-listener, sentinel, and delegation regressions.
- e2e/vt-navigation.spec.ts + fixtures `expectNoVtReload`: VT proven (window probe survives, no new navigation entry).
- Event-name mapping: the acceptance list names `cv_next_step` — that event is emitted by **cv.adrianwedd.com** (the CV site, verified in `docs/analytics-production-receipt-2026-09-04.md`), not by this repo's Analytics.astro. This site's single-fire counterparts are `cv_view` (CV link click) and the high-intent events above; the migration renamed nothing.
- DebugView: GA Admin DebugView reported zero devices even with `debug_mode=true` on 16 collector-accepted requests (recorded 2026-09-04 as a GA reporting limitation, not an implementation failure). Per the controller's stop conditions, DebugView absence is not a blocker; production event semantics are verified at the collector boundary (wire receipts).

### Gate 4 — functional regression on the merge candidate

- `npx astro check` clean; `scripts/validate-content.js` clean; `npm run check:links` clean; Pagefind indexed 352 pages (12369 words); `npm run test:unit` green; build size within budget; no raw `<img>`; .webp/.jpg twins present.
- CI on 048b720: `build` (1m11s), `unit`, `smoke`, `worker-csp`, CodeQL, Socket — all green.
- Full nightly e2e (`npm run test:e2e:full`, chromium + mobile-chromium Pixel 5, `--grep-invert @smoke`): **not run before merge** — the run that owned this gate was blocked by the tooling outage described in `docs/incidents/2026-09-05-mutation-plane-common-mode-failure.md`, and the merge proceeded on the green PR gate (build/unit/smoke/worker-csp/CodeQL/Socket) plus Gate 5 browser verification. Run immediately post-merge on `9c75104`: **18 passed / 6 failed**, then **24/24 green** after the fix in [#660](https://github.com/adrianwedd/adrianwedd.com/pull/660).
  - All six failures were `mobile-chromium`, all in the new `vt-idempotence.spec.ts`, all the same shape: a 30s timeout clicking a header nav link. Cause was a test defect, not a migration regression — the specs clicked links inside `<nav aria-label="Main navigation">`, which is `hidden md:flex`, so at the Pixel 5 viewport those links exist but never become visible. `playwright.config.ts:38-41` already documented the trap. `clickHeaderLink()` now uses the desktop nav where visible and otherwise opens the hamburger, so the specs assert the same contract on both viewports instead of being desktop-only by accident.
  - Recorded plainly because it matters: the gate the outage blocked was the gate carrying the finding.

### Gate 5 — Lighthouse before/after + browser verification

Before = Astro 6.4.8 @ 60cd97e; after = Astro 7.3.1 @ 048b720. Same machine, same Chrome, same day; 7 pages × 3 runs; medians.

| page         | perf    | a11y      | bp        | seo       | LCP           | CLS   | TBT   | JS        | bootup      |
| ------------ | ------- | --------- | --------- | --------- | ------------- | ----- | ----- | --------- | ----------- |
| `/`          | 99 → 99 | 100 → 100 | 100 → 100 | 100 → 100 | 2.11s → 2.10s | 0 → 0 | 0 → 0 | 42 → 44KB | 679 → 556ms |
| `/about/`    | 99 → 99 | 100 → 100 | 100 → 100 | 100 → 100 | 2.11s → 2.11s | 0 → 0 | 0 → 0 | 43 → 44KB | 224 → 205ms |
| `/audio/`    | 99 → 99 | 95 → 95   | 100 → 100 | 100 → 100 | 2.10s → 2.10s | 0 → 0 | 0 → 0 | 41 → 43KB | 90 → 99ms   |
| `/blog/`     | 99 → 99 | 95 → 95   | 100 → 100 | 100 → 100 | 2.10s → 2.10s | 0 → 0 | 0 → 0 | 41 → 43KB | 107 → 110ms |
| `/gallery/`  | 95 → 95 | 96 → 96   | 100 → 100 | 100 → 100 | 2.78s → 2.78s | 0 → 0 | 0 → 0 | 41 → 43KB | 322 → 220ms |
| `/now/`      | 99 → 99 | 100 → 100 | 100 → 100 | 100 → 100 | 2.10s → 2.11s | 0 → 0 | 0 → 0 | 44 → 45KB | 201 → 158ms |
| `/projects/` | 99 → 99 | 96 → 96   | 100 → 100 | 100 → 100 | 2.11s → 2.11s | 0 → 0 | 0 → 0 | 41 → 43KB | 143 → 124ms |

Category scores and LCP/CLS/TBT flat; page weight +≤2KB (Astro 7 runtime JS); bootup improves on 5/7 pages (largest `/gallery/` 322→220ms), `/audio/` +9ms and `/blog/` +3ms within run noise. One first-pass outlier (2156ms bootup on `/`) was CPU contention from a concurrent sibling-worktree npm ci; table reports the clean idle-machine re-run.

Browser verification (Playwright MCP against the Astro 7.3.1 preview, DOM/console/network only — no screenshots): **desktop 1440×900** — every template touched by the migration verified with rendered JSON-LD (all parse, all `url`/`@id`/`mainEntityOfPage` absolute, canonicals correct): blog article (Article + VideoObject + BreadcrumbList), project (WebPage + CreativeWork + VideoObject + BreadcrumbList), gallery collection (ImageGallery), gallery image detail (ImageObject), audio episode (AudioObject + CDN audio src), fixes article (Article), both case-study templates (Article via the captured `site`/`pathname`/`pageUrl` consts); plus `/`, `/blog/` (12 posts), `/projects/`, `/gallery/` (7/7 images), `/audio/` (12 episodes + RSS link), `/search/` (Pagefind: 1 root, 5 results for "protest"), `/about/` (Person), `/now/`, `/services/` (WebPage + ProfessionalService). Islands hydrated on article/project/audio pages. Under consent-rejected state: zero tracker scripts loaded, zero `dataLayer` events across the whole journey, zero console errors since the consent reset. Zero broken images on every page (the gallery lightbox's JS-populated `<img src="">` placeholder is the deploy-gate-documented exception, verified via `getAttribute`). `/services/` network log: 14 requests, all 200, no duplicates, no 404s. **Mobile 390×844** — hamburger menu toggles exactly once per click (none→block→none→block) and closes on VT navigation; `/blog/` (12 posts), article page (4 islands, no element exceeds the 390px viewport), `/search/` (Pagefind 1 root, 5 results) — no horizontal overflow anywhere, zero console errors across the entire mobile session. The only console errors in the whole session were on the first load before the profile's stored consent was cleared (third-party LinkedIn/GA/AdSense fetches failing on localhost — not site defects).

### Gate 6 — #586 advisory disposition (as of 2026-09-05)

Dependabot alerts on main at migration time, and where each stands after #657:

| advisory                            | severity | range         | path                                                                       | disposition                                                                                                                                                                                                     |
| ----------------------------------- | -------- | ------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GHSA astro XSS #1                   | low      | <7.0.4        | astro                                                                      | **fixed by 7.3.1** in #657                                                                                                                                                                                      |
| GHSA astro XSS #2                   | medium   | ≥2.9.0 <7.0.6 | astro                                                                      | **fixed by 7.3.1** in #657                                                                                                                                                                                      |
| GHSA astro XSS #3                   | medium   | ≥2.9.0 ≤7.0.9 | astro                                                                      | **fixed by 7.3.1** in #657                                                                                                                                                                                      |
| fflate (reDoS / zip path traversal) | moderate | —             | (transitive, prod)                                                         | **not addressed by this migration** — below the `--audit-level=high` gate; tracked by Dependabot PR #651, left open                                                                                             |
| postcss-selector-parser             | low      | <7.1.3        | dev-only via eslint-plugin-astro                                           | #657 bumps eslint-plugin-astro to 3.1.0; fix is 7.1.3 — **dev-only, low; not merged here**                                                                                                                      |
| extract-zip                         | **high** | ≤2.0.1        | dev-only via @lhci/cli → lighthouse → puppeteer-core → @puppeteer/browsers | **UNPATCHED — watch item.** Dev-only (Lighthouse CI tooling, never in the shipped site or prod deps). No fixed version exists in the advisory's affected range at QA time. NOT claimed fixed by this migration. |

`npm audit --omit=dev` (npm 11, bulk advisory endpoint) on the post-merge root lockfile: **0 high, 0 critical** — consistent with the deploy gate.

Audit-step change in `deploy.yml` (048b720): the three `npm audit` steps now run `npx -y npm@11 audit --audit-level=high --omit=dev` because npm ≤10's `/audits/quick` endpoint is being retired (400 "Invalid package tree" on GitHub runners since 2026-09-04). Same policy, bulk advisory endpoint; gate not weakened; verified locally against all three lockfiles; the Node/npm that builds is unchanged.

### Gate 7 — hostile QA

Three engines ran the same broad brief in parallel against both subjects (A: migration `60cd97e..9c75104`; B: e2e follow-up `9c75104..149b519`), each reporting independently; no brief was split by angle. Transcripts: `/tmp/codex-qa-657.txt`, `/tmp/agy-qa-657.txt`, `/tmp/hermes-qa-657.txt`. All load-bearing claims were verified against primary evidence (CI logs, git history, Playwright traces) before acting.

**All three engines independently found no production regression in the migration itself.** Every should-fix landed as a follow-up commit on `fix/e2e-mobile-header-nav`: `e955c20` (missing `clickHeaderLink` import), `8122d85` (prettier), `f6ecdfc` (`:visible` theme toggle), `59f090d` (tap-under-emulation + comment corrections).

- **codex** (read-only sandbox, verified claims with live `tsc`/ESLint/diff runs): Subject A clean — no production blocker or should-fix across template-body `Astro` audit, JSON-LD/canonical/OG construction, lockfile (exact versions, single deduped Vite 8.2.2 tree), CSP/strict-dynamic nonce interaction, and analytics invariants. Two should-fix on B at the briefed tip `149b519`: (1) `analytics-intent.spec.ts` called `clickHeaderLink` without importing it — smoke-breaking, confirmed by `TS2304` — **fixed in `e955c20`**; (2) global `reducedMotion: 'reduce'` leaves no normal-motion coverage — **partially addressed in `e955c20`** (`e2e/scroll-reveal.spec.ts` runs the reveal pipeline under `no-preference`; the residual blind spot is accepted and recorded below). Also assessed `clickHeaderLink`/`clickCard` as not weakening actionability (no forced clicks, no DOM event dispatch).
- **agy** (full read-only audit): Subject A clean — 8/8 touched templates verified frontmatter-scoped, 147 JSON-LD schemas parse with 0 URL errors, 89,829 internal links pass, lockfile resolution exact. Subject B: found the missed `:visible` on `vt-navigation.spec.ts:38` (same hidden-desktop-toggle class as the two B-fixed siblings; a 30s hang on the nightly mobile project) — **fixed in `f6ecdfc`**.
- **hermes** (cross-checked codex/agy claims against primary evidence, pinned immutable commit-pair diffs): no blockers. Should-fix **A1** — pre-existing GA4 BFCache gap: `Analytics.astro` has no `pageshow` handler, so with `send_page_view: false` a back/forward restore fires no `page_view`; real users' back-navigations are invisible to GA4. Not introduced by the migration (Astro 6 identical); the journey test currently pins it as accepted. **Filed as [#663](https://github.com/adrianwedd/adrianwedd.com/issues/663); fix belongs in Analytics.astro, then the spec tightens.** Should-fix **B3** — the remaining below-hero content clicks shared the failing geometry of the audio cards (proven red 2/2 on CI run 33939494950) — **routed through `clickCard` in `59f090d`**. Notes: **A2** audit step uses unpinned `npm@11` (kept deliberately — a security gate wants a current npm; supply-chain surface accepted, recorded here instead of pinned); **A4/B4a** two comments overstated what they describe (`expectNoVtReload` cannot distinguish a VT swap from a BFCache restore; the config comment misattributed the whole failure to ScrollReveal) — **both corrected in `59f090d`** with the two-effect story plus the `dde8e55` bare-key history; **B5** `clickHeaderLink` has no invisible-click vector (residual: the already-open-menu tolerance is separately pinned by the menu-closes-after-swap assertion); **A3** #658/#659 pins endorsed as correct (disagreeing with codex's stricter read); **A5** stale local `.astro/preview.json` lock (gitignored, local-only — cleaned).

**Post-QA CI validation.** The nightly mobile failure root cause was established from the traces across three CI runs, each disproving one hypothesis. Run [33939494950](https://github.com/adrianwedd/adrianwedd.com/actions/runs/33939494950) (clickCard v1, mouse): 30s of internal retries all ending in `<hero> intercepts pointer events` while the trace screencast shows the card scrolled into view — persistent, not a settle race. Run [33950106238](https://github.com/adrianwedd/adrianwedd.com/actions/runs/33950106238) (`59f090d`, touch dispatch): `locator.tap` fails identically, so the defect is the main-thread actionability hit test both paths share, not mouse-event synthesis. A probe added around the dispatch then showed `force` has its own failure mode (post-VT taps land in the still-up `::view-transition` overlay and the click is lost — three locally-green tests went red). The fix that satisfies both modes, `5173bef`: `clickCard` probes the main thread (attached as `clickCard-hit-test`), taps with a 5s bound, and escalates to `tap({ force: true })` only on that bounded failure. The seven remaining below-hero content clicks were routed through `clickCard` in the earlier `59f090d` (hermes B3). Local full suite 24/24 both projects; the seven below-hero click routings and every clickCard call site's outcome assertion are unchanged. CI full run on `5173bef`, [33950660671](https://github.com/adrianwedd/adrianwedd.com/actions/runs/33950660671): 23/24 — **every card click site passed**, the one failure being a control that had never routed through `clickCard`: the AudioPlayer island's Play button on the fresh-loaded episode page, where the actionability hit test at the button's point resolves to the island's own wrapper div for the full 30s window (trace in the run's artifact), the fixed consent banner intercepting some retries. Same desync family, one control deeper; fixed in `175dd40` by routing that click through `clickCard` (whose scroll-to-centre also clears the consent banner). Pre-existing family, newly reached: the nightly was red on Astro 6 every night 2026-08-28 → 2026-09-04, and the Sep 4 nightly (`60cd97e`) died at the audio card click on the same spec, so the Play button had never been exercised on CI's mobile project before. Validation run for `175dd40`, [33951117271](https://github.com/adrianwedd/adrianwedd.com/actions/runs/33951117271): **green** — unit 136/136, smoke 9/9, full 24/24. First green CI full run on this branch; [#660](https://github.com/adrianwedd/adrianwedd.com/pull/660) merged as `579f6fa` on that evidence.

## Production verification

- Deploy: push of 9c75104 → run [33937822263](https://github.com/adrianwedd/adrianwedd.com/actions/runs/33937822263) — success; all gates passed (type check, content validation, audits, build, size budget, img gates, worker tests, lychee, internal links, og refs, site tests, pages artifact).
- `https://adrianwedd.com/` and `https://www.adrianwedd.com/` (both production origins): HTTP 200 (apex direct; `www` 301 → apex).
- Bounded production smoke (2026-09-05, headless Chromium against `https://adrianwedd.com`, GA/LinkedIn/AdSense collectors **route-aborted** so verification writes nothing to production analytics; `dataLayer` observed directly — wire-level collector semantics were already verified in Gate 3): consent accepted, then Home → Blog → Projects → About → Services via header links. **5 navigations (1 hard load + 4 View Transitions), 5 `page_view` events, 4/4 legs confirmed as real VT swaps** (window state survived, no new navigation entry). `page_location` values were origin+path only — `https://adrianwedd.com/`, `/blog/`, `/projects/`, `/about/`, `/services/` — with zero query leakage despite the entry URL carrying `?utm_source=smoke&utm_medium=test`. Zero console errors, zero page errors. Event names seen: `js`, `config`, `page_view`, `project_click`. The `project_click` is a **pre-existing defect surfaced by this smoke, not a migration regression**: `Analytics.astro:499` binds the event to `a[href*="/projects/"]`, which the header nav's own Projects link matches — filed as [#661](https://github.com/adrianwedd/adrianwedd.com/issues/661), not fixed inline because narrowing the selector changes the metric's historical comparability.
- Deployed SHA confirmed by three independent signals: the `github-pages` deployment record reports `sha: 9c75104`; the `deploy.yml` run on `9c75104` completed success; and the live homepage's first `/_astro/` chunk (`ClientRouter.astro_astro_type_script_index_0_lang.DLsvjIX3.js`) is present byte-for-name in the local Astro 7.3.1 `dist/` — production is serving the Astro 7 output, not a cached Astro 6 build.
- CSP worker intact under Astro 7: a single request returned matching header and body nonces (`nonce-qyQdDas/2xhb2E/xomWqtw` in both), confirming per-request nonce injection still works against the new build. HSTS present (`max-age=63072000; includeSubDomains`).
- Key URLs, all HTTP 200: `/`, `/blog/`, `/projects/`, `/about/`, `/search/`, `/audio/`, `/services/`, `/rss.xml`, `/sitemap-index.xml`, `/audio/podcast.xml`. `/pagefind/pagefind-entry.json` 200 (search index deployed). `content-integrity.yml` passed against `9c75104`.

## Deferred work

- #553 (image service migration) — untouched, next frontier.
- #397 — untouched.
- extract-zip (dev-only, high, unpatched) — watch; revisit when upstream/puppeteer ships a fix.
- fflate (moderate, prod-transitive) — Dependabot #651 left open.
- Unrelated Dependabot PRs (#644 #646 #651 #653 #639 #640 #622) — deliberately left open; not merged merely for being green.
