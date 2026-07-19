# QA Follow-up Decisions — Design

**Date:** 2026-07-19
**Status:** Approved by Adrian (decision session, this date)
**Context:** Remaining owner-decisions from the four-engine QA sweep (PRs #534–#540 already merged). Hard constraint from Adrian: **no historic permalink may start returning 404** — redirects are acceptable, dead URLs are not.

## Decisions

| Item | Decision |
|---|---|
| Tag URL normalization | Normalize to lowercase canonical archives; 301 old mixed-case URLs |
| AdSense | **Keep** (stays behind its own advertising-consent toggle from #536) |
| Crisis-alert channel | Email alert via **Cloudflare Email Sending** (not Resend) |
| PR #531 (worker-deploy automation) | Rebase onto main, re-verify, merge |
| HeroCanvas | Externalize inline script into a cached module |
| Dependabot (4 open alerts) | Bump all four (playwright high/dev, js-yaml med/dev, uuid med/dev, @babel/core low/runtime) |

## Design

### 1. Tag normalization + 301s
- Normalize tag values in content frontmatter to a canonical lowercase form; tag archive pages are generated only at the canonical lowercase path (`/blog/tag/<lower>/...`).
- Display casing can be handled by a presentation map if needed (e.g. `ai` → "AI"); URLs are always lowercase.
- **Redirects live in the CSP worker** (`worker-csp/`, route `adrianwedd.com/*`), which already issues the www→apex 301: if a request path matches `/blog/tag/<Tag-with-uppercase>/…`, 301 to the lowercased path, preserving pagination suffix and query. This gives real 301s (GitHub Pages static output cannot).
- Result: no 404s, one archive per tag, SEO consolidates. Content detail permalinks untouched.

### 2. Crisis-alert email (worker)
- In `worker/`'s comment monitor (`/api/cron/comments`), when a comment is classified as crisis, send an email to Adrian via Cloudflare Email Sending (Workers `send_email` binding / Email Service — per current Cloudflare docs at implementation time), in addition to the existing KV flag + health surfacing from #539.
- Dedupe: don't re-email for a comment already flagged (key off the existing 90-day-TTL crisis record).
- Failure to send must not fail the cron run — log and continue; health endpoint already surfaces flags as the fallback channel.
- Requires wrangler config for the email binding + verified destination address; document the one-time setup step in the worker README.

### 3. PR #531 merge
- Rebase `sprint-39` branch onto current main (post-#540 prettier pass will conflict on formatting — resolve by re-running prettier).
- Re-run its unit suites + lint; verify workflow file still matches the required-checks policy (deploy gate is approval-gated, push-to-main/workflow_dispatch only).
- Merge when green. This retires the manual `wrangler deploy` step.

### 4. HeroCanvas externalization
- Move the inline hero-canvas script on the homepage into a `src/` module loaded as an external script (hashed, cacheable asset). No behavioral or visual change.
- Must keep View Transitions compatibility (sentinel + `astro:after-swap` pattern per CLAUDE.md) and remain CSP-clean under the nonce worker.

### 5. Dependabot bumps
- Bump playwright, js-yaml, uuid, @babel/core to patched versions (overrides in `package.json` if transitive parents pin lower — per the established deploy-audit-gate pattern).
- Verify with `npm audit --audit-level=high --omit=dev` (the deploy gate command) and full local `npm run verify`.

### Explicitly out of scope
- Any change to blog/project/gallery/audio detail-page URLs.
- Dropping or restructuring AdSense (kept as-is).
- Push-notification infrastructure for crisis alerts.

## Testing
- Tags: unit test the lowercase-redirect logic in `worker-csp/` suite; internal-link checker (`npm run check:links`) confirms no generated page links a non-canonical tag URL; post-deploy curl checks that an old mixed-case URL 301s with path+query preserved.
- Crisis email: worker vitest with mocked email binding — crisis comment → one send; repeat comment → no second send; send failure → cron still succeeds.
- HeroCanvas: build + visual check of homepage, VT navigation away/back, no CSP console errors.
- #531 and Dependabot: their own suites + the deploy gate.
