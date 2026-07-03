# ROADMAP — 2026 H2 (Sprints 36–47)

Written 2026-07-02. Successor to [ROADMAP.md](./ROADMAP.md) (Sprints 1–21, all issues closed) and the Sprint 22–26 plans in `docs/plans/`. Sprint 35 was the 2026-05-29 session; the June epic work (E4 pagination, E5 analytics, search/vis/pagination UX #513, Agent in the Walls #505–#512, local/case-studies #515/#516, CSP reporting #497) ran unnumbered. Numbering resumes at 36.

**State of the repo (2026-07-02):** one open issue (#473 security theme), no open milestones, three open dependabot PRs (#517–519), three `content/auto-drafts-*` branches holding unmerged content, no test suite on the Astro site, and Cloudflare Workers still deployed manually (merged-but-undeployed drift is a recurring class).

**Sequencing logic:** close drift first (S36), finish the security epic (S37), then build the two durable guardrails the repo lacks — a site test suite (S38) and automated worker deploys (S39) — before spending the remaining sprints on growth (content, services, media) interleaved with measurement and quality sweeps. Sprints are sized like the historical milestones: ~5–6 items each.

---

## Sprint 36: Drift Closure & Housekeeping

Goal: make `main`, the deployed workers, and the branch list agree with reality.

- [ ] Verify deployed workers match `main`: HSTS (#492), COOP/CORP (#494), health KV cap (#495), CSP Report-Only (#497) — curl the live headers; `wrangler deploy` anything stale
- [ ] Root cruft: remove or relocate `diff.txt`, `modify_config.py`, `put_payload.json`, `tunnel_config.json`; commit or discard `scripts/notebooklm/scripts/strip-outro.sh`
- [ ] Commit `worker-mta-sts/` (uncommitted since the 2026-06-15 email-security sweep)
- [ ] Branch triage: delete merged remotes (`codex/*`, `content/499-asr-reframing`, `content/youtube-urls-*`, `feat/*`, `spec/*`); **preserve** the three `content/auto-drafts-*` branches (unmerged content — triaged in S40)
- [ ] Dependabot #517–519: merge greens; document an auto-merge policy for patch/minor dev-dep bumps
- [ ] Refresh `docs/ROADMAP.md` statuses (Sprint 18–21 issues all closed since it was last touched)

**Exit:** clean `git status`, remote branches = `main` + 3 auto-drafts, live worker headers verified against `main`.

## Sprint 37: Security Close-Out, Part 1 (#473)

Goal: check every box in #473 that doesn't depend on external parties.

- [ ] Cloudflare rate-limit rule on `social.adrianwedd.com/api/*` (per `worker/docs/rate-limiting.md`, #493) — apply in dashboard, verify with a burst test _(verified absent on the zone 2026-07-03; API token lacks WAF write, so dashboard it is)_
- [x] First analysis of collected CSP Report-Only data (#497 collector); fix genuine violations; write the enforce-flip criteria — `worker-csp/docs/csp-report-analysis-2026-07-03.md`; two GA4 gaps fixed in `csp.ts`, live on next manual `wrangler deploy`
- [ ] Meta-CSP fallback fix in `SEOHead.astro` (`'unsafe-inline'` on the worker-bypass path) — **needs Adrian's pick** of the three documented tradeoffs (hashes vs drop vs origin lock)
- [x] `/.well-known/security.txt` if absent (SECURITY.md exists; the machine-readable twin may not) — added, expires 2027-07-01

**Exit:** #473 High section fully checked; CSP report pipeline observed with real traffic; enforce-flip date set.

## Sprint 38: Test Foundation for the Astro Site

Goal: end the "no test suite" era. The View-Transitions script lifecycle is the repo's recurring regression class — cover it first.

- [ ] Playwright smoke suite: VT navigation between page types, theme-toggle persistence across swaps, consent-banner gating (no GA4 before consent), Pagefind search, pagination, audio player, blog tag filters
- [ ] Wire a fast subset into the PR gate (`deploy.yml` runs on PRs since #503); full suite on dispatch/nightly
- [ ] Unit tests (vitest, matching `worker/`'s setup): `slug()`/`imageSlug()`, `image-dimensions.ts` parser, content-collection schema edge cases
- [ ] Root `npm test` script; document in CLAUDE.md alongside the worker suites

**Exit:** PR gate runs smoke tests in <3 min; a VT-lifecycle regression can no longer land silently.

## Sprint 39: Worker Deploy Automation & Observability

Goal: kill the "merged but awaiting manual `wrangler deploy`" drift class permanently.

- [ ] GitHub Actions deploy for `worker/`, `worker-csp/`, `worker-mta-sts/` gated on a GitHub environment approval (keeps the human in the loop Adrian wants, removes the forgetting)
- [ ] Post-deploy verification step: header checks + `/api/health` probe
- [ ] Drift check in CI: deployed worker version vs `main` (fail loud when they diverge)
- [ ] Error/uptime alerting: health-check cron → GitHub issue, same pattern as the token expiry alert (#496); decide whether FB token alerts need a second channel beyond issues

**Exit:** merge → approve → deployed → verified, with zero local wrangler invocations; drift alarms exist.

## Sprint 40: Content Sprint 1 — Security Post & Series Debts

Goal: pay down the content debts already researched or owed.

- [ ] LLM-security failure-first post from the harvested sources (Das 2024 survey, Shayegani 2023 adversarial survey)
- [ ] Eight Minutes Part 3: the owed takedown-outcomes follow-up note
- [ ] the-tell / the-recital slot collision (#10/#12) — **needs Adrian's renumber-or-cut call**, then publish or archive
- [ ] Triage the three `content/auto-drafts-*` branches (20260531 / 20260607 / 20260614): harvest what's good, close the rest with notes
- [ ] NLM kit sweep for recent posts shipped without one (AI data centres #514 first candidate)

**Exit:** ≥2 posts live with full kits; zero orphan auto-draft branches; no owed series notes.

## Sprint 41: Services & Local Conversion (Track A Follow-Through)

Goal: turn the just-shipped `/local` landing (#515) + case-studies collection (#516) into a working funnel.

- [ ] 2–3 additional case studies in the collection
- [ ] Testimonials / social-proof block on `/local` and `/services`
- [ ] LocalBusiness + Service JSON-LD on `/local` (ProfessionalService already on `/services`)
- [ ] Consent-gated conversion events: booking-widget open/complete, contact submit
- [ ] Local SEO pass: titles/meta/OG on `/local` + case studies; internal links from relevant blog posts

**Exit:** `/local` has ≥4 case studies, schema validates in Rich Results, conversions visible in GA4.

## Sprint 42: Media & NotebookLM Pipeline

Goal: full asset coverage and a one-command video path.

- [ ] NLM asset coverage sweep: every published post/project/case-study has its intended audio/video/infographic
- [ ] The 4 flagged sub-256k NLM-native audio takes — **needs Adrian's re-roll-or-accept call**, then action it
- [ ] YouTube upload automation: script + checklist (3s signoff sting concat with `-c copy`, channel-identity verification step)
- [ ] Audio RSS enclosure audit (enclosure URLs, durations, MIME types across the audio collection feed)
- [ ] _(Gated on AI Studio credits)_ Index suite render: apex track + the unpaired 06+02

**Exit:** no published content missing its kit; YouTube publish is one command; index suite rendered or still explicitly credit-gated.

## Sprint 43: Performance & Core Web Vitals

Goal: put performance back on an automated leash (CI Lighthouse has been manual since #488).

- [ ] Scheduled Lighthouse workflow (weekly dispatch/cron) with trend artifact, same lhci config as local
- [ ] Image pipeline: AVIF variants via `astro:assets`; audit heroImage/carousel weights
- [ ] JS budget: audit current chunks, then promote the >150KB warning to a hard gate
- [ ] Pagefind index size + homepage payload audit

**Exit:** automated Lighthouse trendline exists; budgets are gates, not warnings; no page below the 90% thresholds.

## Sprint 44: Accessibility & Design QA Sweep

Goal: a full a11y pass now that search/pagination/local reshaped key pages.

- [ ] Multi-engine QA round (Codex/Agy/Hermes, one identical broad brief) on the rendered site
- [ ] axe-core wired into the Playwright suite from S38 (key pages, both themes)
- [ ] Keyboard + screen-reader pass on the 13 islands (AudioPlayer, Quiz, MindMap, TableOfContents first)
- [ ] Light-mode contrast re-verify (WCAG AA on warm cream, umber accent)

**Exit:** findings triaged to issues, P0/P1 fixed, axe clean on key pages in both themes.

## Sprint 45: Analytics & Measurement Loop

Goal: close the loop from traffic data to content decisions.

- [ ] Search Console API into the analytics fetch (queries, CTR, positions) alongside GA4
- [ ] 404 hits + zero-result Pagefind searches tracked (consent-gated)
- [ ] `/analytics` dashboard refresh with the new sources
- [ ] Quarterly content-performance review doc — top/underperforming content, search gaps — feeding Sprint 46's picks

**Exit:** dashboard shows search data; review doc committed with ≥3 actionable insights.

## Sprint 46: Content Sprint 2 & Discoverability

Goal: publish what S45's data says to publish, and take a position on AI crawlers.

- [ ] `llms.txt` + explicit AI-crawler robots policy (GPTBot, ClaudeBot, etc.) — deliberate stance, either way
- [ ] Structured-data audit: every template through Rich Results, fix warnings
- [ ] 1–2 posts driven by the S45 review + content-pipeline discoveries
- [ ] Internal-linking pass: orphan-page report from the link-checker data, fix the worst

**Exit:** llms.txt live, schema validates everywhere, posts shipped with kits.

## Sprint 47: Email/DNS Completion, Ops Hardening & Retro

Goal: finish the 2026-06-15 email-security sweep's tail and close the H2 arc.

- [ ] DS records at registrars for the 7 external domains (manual: GoDaddy/Porkbun/.ch)
- [ ] MTA-STS `testing` → `enforce` flip (after a clean TLS-RPT window)
- [ ] _(Gated on Google Workspace recovery)_ rotate the 1024-bit Google DKIM key
- [ ] Secret-rotation runbook: worker secrets, GH PATs, GA4 service-account key — schedule + procedure
- [ ] Close #473; H2 retro; draft the next roadmap

**Exit:** email sweep fully closed or each remaining item explicitly externally-gated; #473 closed; successor roadmap drafted.

---

## Decisions Adrian owes (blocking specific items, not sprints)

| Decision                                                                 | Blocks                 | Sprint |
| ------------------------------------------------------------------------ | ---------------------- | ------ |
| Meta-CSP approach (hashes / drop / origin lock — 3 tradeoffs documented) | SEOHead fallback fix   | S37    |
| the-tell / the-recital: renumber or cut                                  | Draft publication      | S40    |
| 4 sub-256k audio takes: re-roll or accept                                | Audio coverage closure | S42    |
| FB token alert channel beyond GitHub issues                              | Alerting design        | S39    |
| Dependabot auto-merge policy sign-off                                    | Auto-merge enablement  | S36    |

## Externally gated

- **AI Studio credits** → index suite render (S42)
- **Google Workspace recovery** (case #72265229) → DKIM rotation (S47)
- **Clean TLS-RPT reporting window** → MTA-STS enforce (S47)
- **Registrar access** (GoDaddy/Porkbun/.ch) → DS records (S47)

## Standing constraints

- URLs are permanent; audio is never re-encoded; every video gets the signoff sting; social drip is date-triggered — see CLAUDE.md and memory for the full rules
- Sprint order is swappable **except** S36→S37→S38/S39 (drift → epic close → guardrails) and S45→S46 (measure → then pick content)
- Anything cut from a sprint moves to the next, not to silence — this doc gets updated when reality diverges

**Nothing here is cancelled. It's sequenced.**
