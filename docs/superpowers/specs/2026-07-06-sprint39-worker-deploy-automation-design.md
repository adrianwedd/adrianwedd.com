# Sprint 39 — Worker Deploy Automation & Observability

**Date:** 2026-07-06
**Status:** Design (revised after 3-engine QA — Codex + Hermes; Agy did not return)
**Goal:** Kill the recurring "merged but awaiting manual `wrangler deploy`" drift class permanently, while keeping the human-in-the-loop approval Adrian wants.

## Problem

The repo has three Cloudflare Workers, all deployed by hand (`cd <dir> && npx wrangler deploy`):

| Worker | Dir | Role | Blast radius |
|---|---|---|---|
| `adrianwedd-social` | `worker/` | Social automation API (Hono). KV `SOCIAL`, Durable Object `CronLock`, rate-limit binding, ~14 secrets, cron endpoints. Has `GET /api/health`. Has a vitest suite + `package.json`. | Medium — a broken deploy stops social posting/comment monitoring, but the website is unaffected. |
| `adrianwedd-csp` | `worker-csp/` | Injects per-request CSP nonces into every HTML response. **Routed on `adrianwedd.com/*`.** Has a vitest suite + `package.json`. | **Critical** — on the live site's HTML delivery path. A broken deploy mangles or blanks every page. |
| `adrianwedd-mta-sts` | `worker-mta-sts/` | Serves the MTA-STS policy at `mta-sts.adrianwedd.com`. Custom domain. **Single bare `index.js` — no `package.json`, no deps, no test suite.** | Low — affects inbound-mail TLS policy discovery only. |

There is **no deploy CI** for any of them. Every prior session's handoff carries a "worker still awaits manual `wrangler deploy`" item (HSTS, COOP/CORP, health-cap, rate-limit binding, CSP fixes were all stranded this way). Deploys are forgotten, and there is no signal when deployed code diverges from `main`.

## Key enabling fact

`wrangler deploy` uploads **worker code + `[vars]` from `wrangler.toml` only**. It does **not** touch secrets — those persist in Cloudflare from prior `wrangler secret put` and survive redeploys (verified against wrangler `cli.js`: version upload uses `bindings_inherit: strict`, `keepSecrets` on). Therefore CI needs only Cloudflare API credentials, **not** the 14 platform tokens. This keeps CI's blast radius to "can deploy worker code," not "holds all social credentials."

## Decisions (locked with Adrian)

1. **Trigger + gate:** Auto-trigger on merge to `main` (path-filtered per worker), paused behind a GitHub Environment approval with Adrian as required reviewer. Plus `workflow_dispatch`.
2. **Verification failure:** Auto-rollback to the previous version for **all three** workers, then fail the workflow red.
3. **Drift check:** Nightly scheduled job + manual dispatch (not per-PR).
4. **DO-migration rollback is out of scope** — treated as a hard manual-intervention path (see limitations).

## Credentials — two tokens (revised per QA #4)

A GitHub Environment's protection rules gate **any** job that references it, including reads. A scheduled, ungated drift-check therefore cannot pull its token from the gated `worker-production` environment (it would sit waiting for approval). We split credentials by capability and gate:

| Secret | Scope | Where it lives | Used by |
|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | **Edit** Cloudflare Workers Scripts (+ Account Settings: Read; + Zone: Workers Routes Edit for the `worker-csp` route and Zone: DNS Edit for the `mta-sts` custom domain — only exercised if a route/domain must be (re)created; all three already exist) | `worker-production` **environment** secret (gated) | deploy + rollback (Job B) |
| `CLOUDFLARE_API_TOKEN_READONLY` | **Read** Workers Scripts (sufficient for `deployments list`) | **repo-level** secret (ungated) | drift-check (Job C) |
| `CLOUDFLARE_ACCOUNT_ID` | n/a (account id) | repo-level secret (both jobs read it) | all jobs |

This is also better least-privilege: the ungated, more-frequently-run drift job never holds a write-capable token.

## Architecture

One new workflow: **`.github/workflows/worker-deploy.yml`**.

```yaml
name: Worker Deploy
on:
  push:
    branches: [main]
    paths: [worker/**, worker-csp/**, worker-mta-sts/**]
  workflow_dispatch:
    inputs:
      target: { type: choice, options: [all, social, csp, mta-sts] }
      mode: { type: choice, options: [deploy, drift-only] }   # drift-only = read-only (plan-stage QA)
  schedule:
    - cron: '0 15 * * *'   # ~01:00 AEST, offset from the e2e nightly (14:00 UTC)

permissions:
  contents: read           # checkout only; never writes to the repo (QA M1)
```

A dispatch chooses `mode`: `deploy` (deploy the `target`, gated) or `drift-only` (read-only check, no deploy) — so a manual drift check never mutates prod (plan-stage QA). Concurrency is **per-worker** on deploy (`group: worker-deploy-${{ matrix.worker.key }}`), so a CSP deploy waiting on approval doesn't block an mta-sts deploy; the drift job has no group. Every wrangler-running job first installs a **pinned** wrangler (`npm --prefix worker ci` → `WRANGLER_BIN`); a bare `npx wrangler` in CI would download an unpinned version and fails outright in `worker-mta-sts/` (no `node_modules`) — plan-stage QA.

Three logical jobs:

### Job A — `detect` (fast, no secrets)

`fetch-depth: 0` checkout (ancestry needed downstream — QA #6). Determines which workers to act on:

- On `push`: diff the changed paths. Base ref = `github.event.before`, **but** guard the all-zeros first-push SHA by falling back to the repo root commit (`git rev-list --max-parents=0 HEAD`) or simply treating every worker as changed — never `HEAD^`, which doesn't exist on a 1-commit history (QA M5). (In practice `main` is long-lived so this guard is defensive only.)
- On `workflow_dispatch`: expand `target` (`all` → all three).
- On `schedule`: emit the full set for the drift job only (no deploy).

Emits a JSON matrix. Each matrix entry carries the worker's `dir`, its Cloudflare `name`, a `hasPackageJson` flag, and a `hasTests` flag — so downstream steps don't hardcode assumptions that break on `mta-sts`.

### Job B — `deploy` (matrix over changed workers; gated)

`environment: worker-production` (required reviewer = Adrian). Runs on `push` / `workflow_dispatch` only, never `schedule`. `fetch-depth: 0`.

Per-worker steps (all parameterized by the matrix entry):

```
1. checkout (fetch-depth: 0) + setup-node@22 (SHA-pinned per repo convention — QA L2)
2. install ONLY if hasPackageJson:  (cd $dir && npm ci)      # mta-sts is skipped — QA #1/C1
3. test ONLY if hasTests:
     - worker/     → npm test              (vitest run)
     - worker-csp/ → npm test && npx tsc --noEmit
     - mta-sts/    → (no package.json, no tests) → skipped
   abort before deploy if red
4. capture prevVersionId:
     wrangler deployments list --json  → the NEWEST is the LAST element (list is
     sorted ascending by created_on and truncated to 10 — QA #6/H2). Read
     `deployments.at(-1)` and its version id for the rollback target.
5. deploy:  wrangler deploy --message "gitsha:${GITHUB_SHA}"
6. verify (worker-specific, below) with retry/backoff for edge propagation
   (5 attempts, 10s apart, ~50s ceiling)
7. on verify failure → ROLLBACK (see rollback contract below), then exit 1
```

**Rollback contract (revised again after plan-stage QA — Codex/Hermes traced wrangler `cli.js`):**

The earlier draft claimed a migration *pre-check* and a stderr grep for a migration/secret error string. Both QA engines showed that is unreliable: wrangler's rollback handler has no migration-tag comparison, code 10220 is a *changed-secret* case that CI auto-confirms internally (so it never surfaces as a fatal error), and there is no verified migration-block stderr string to grep. The honest, correct contract:

```
- Capture the currently-live version id BEFORE deploy (parse `deployments list --json`,
  take the 100%-traffic version of the newest deployment). Roll back to THAT explicit id,
  never wrangler's default heuristic (which can skip the immediate prior version — QA).
- On verify failure:
    wrangler rollback "$prevVersionId" --yes --message "auto-rollback ${GITHUB_SHA}"
    # --yes is belt-and-suspenders; in CI wrangler already auto-confirms via ci-info.
  - If rollback exits 0 → re-verify (the probe retries internally with backoff); exit 1.
  - If rollback exits non-zero → print a LOUD "MANUAL INTERVENTION REQUIRED" naming a
    Durable Object migration or a changed secret as the likely cause, leave the failed
    version live, exit 1. We do NOT pretend to pre-detect the migration boundary.
- If no previous version was captured → manual-intervention path (can't auto-rollback).
```

### Job C — `drift-check` (schedule + dispatch; ungated, read-only)

`fetch-depth: 0` checkout. Uses `CLOUDFLARE_API_TOKEN_READONLY`. For each worker:

```
1. deployedSha = deployments.at(-1).annotations["workers/message"], strip "gitsha:" prefix
   (the message is a DEPLOYMENT-level annotation, not a version-level one — QA #6/H2)
2. classify:
   - message has no "gitsha:" → DRIFT (reason: "unstamped" — deployed out-of-band, or
     >10 unstamped deploys pushed the stamped one off the truncated list; say so — QA H2)
   - `git cat-file -e ${deployedSha}^{commit}` fails (SHA absent from this clone) → DRIFT
     (reason: "deployed from outside this repo / force-push" — QA #6/H1)
   - SHA exists but `git merge-base --is-ancestor $deployedSha HEAD` fails → DRIFT
     (reason: "history rewritten")
   - `git rev-list ${deployedSha}..HEAD -- <workerPath>` non-empty → DRIFT
     (reason: "undeployed commits touch this worker")
   - else → in sync
3. Aggregate. If ANY worker drifted, fail the job red with a per-worker reason summary.
```

## Per-worker verification checks (revised per QA #3, #7)

Each runs against the live edge post-deploy, with retry/backoff:

| Worker | Verification |
|---|---|
| `adrianwedd-social` | `GET https://social.adrianwedd.com/api/health` → HTTP 200 + valid JSON. **This is a liveness/routing probe, not a health probe.** The unauthenticated response is exactly `{"ok":true}` (`worker/src/index.ts:715-723` returns `{ok:true}` when no `CRON_SECRET`/`PUBLISH_SECRET`/`CLI_SECRET` is supplied). It proves the worker booted and Hono routed the request; it does **not** and **cannot** (without a secret CI deliberately doesn't hold) assert upstream token health. Token expiry is owned separately by `social-token-alert.yml`. |
| `adrianwedd-csp` | `GET https://adrianwedd.com/` → HTTP 200 **and** a `Content-Security-Policy` **response header** (not the origin's `<meta>` tag) matching `nonce-([A-Za-z0-9+/=]{20,})` **and** that same nonce appears in the HTML **body**. Checking the body too proves the worker actually rewrote the page (injected the nonce into `<script>` tags), not merely set a header — a header-only check would miss a broken rewrite (plan-stage QA). |
| `adrianwedd-mta-sts` | `GET https://mta-sts.adrianwedd.com/.well-known/mta-sts.txt` → HTTP 200 + body contains `version: STSv1`. |

## Secrets & setup (Adrian's action items)

Prerequisites the workflow cannot self-provision — captured as a reproducible runbook in the plan:

1. Create **`CLOUDFLARE_API_TOKEN`** — Account → Workers Scripts → **Edit** (+ Account Settings → Read). Add Zone → Workers Routes → Edit and Zone → DNS → Edit **only if** a route/custom-domain will ever be (re)created by CI (all three already exist, so redeploys don't need zone scopes). Store as a **`worker-production` environment** secret.
2. Create **`CLOUDFLARE_API_TOKEN_READONLY`** — Account → Workers Scripts → **Read**. Store as a **repo-level** secret (ungated).
3. Add **`CLOUDFLARE_ACCOUNT_ID`** as a repo-level secret.
4. Create the **`worker-production`** environment with **required reviewer = Adrian**.

## Testing strategy

CI/CD plumbing, so "tests" are staged validation:

1. **Dry-run first:** each worker's deploy is validated with `wrangler deploy --dry-run` in the plan before wiring the live deploy (mta-sts dry-run confirmed working without `npm ci`).
2. **Verification scripts independently runnable** against the current live edge, to confirm the assertions match reality before they gate a deploy.
3. **First real exercise via `workflow_dispatch`**, lowest blast radius first: `mta-sts` → `social` → `csp` last.
4. **Rollback path proven deliberately:** in a dispatch against `mta-sts`, point a verification at a known-failing assertion, confirm auto-rollback fires and restores the prior version (with backoff re-verify), then revert.
5. **Drift check proven both ways:** run on demand once in-sync (green) and once with an intentionally-undeployed worker commit on `main` (red), plus once against an unstamped deployment (expect "unstamped" reason).

## Out of scope / known limitations

- **Durable Object migration rollback (hard limit — QA #5).** Cloudflare **disallows rollback across a Durable Object migration**. Only `worker/` has migrations (`CronLock`, tag `v1`, already applied). A *future* deploy that adds a new migration tag and then fails verification **cannot** be auto-rolled-back; the workflow detects the new tag, refuses to attempt rollback, and demands manual intervention. New DO migrations must be introduced in their own carefully-reviewed deploy.
- **`/api/health` is a liveness probe, not a health probe** (QA #3) — see the verification table. Asserting real token health would require CI to hold a social secret, which is explicitly avoided.
- **No secret management in CI.** Secrets stay manual via `wrangler secret put`. CI never reads, writes, or rotates them. A secret rotated between a deploy and its rollback triggers wrangler's code-10220 path; `--yes` force-confirms it and the rolled-back code runs with current secrets (logged loudly).
- **No staging worker.** Deploys go straight to production behind the approval gate; a preview tier is YAGNI for three small workers.
- **`paths:` won't catch shared-file changes** (root `package.json`/`tsconfig` that a worker extends) — QA M3. Documented; use `workflow_dispatch` to force-deploy after such a change.
- **`worker-csp/README.md` is stale** ("Not deployed" / "routes commented out") — the worker is live and routed (QA L1). The implementer should fix the README as part of this sprint.

## Files touched

- **New:** `.github/workflows/worker-deploy.yml`
- **New:** verification helper(s) — social health probe, `worker-csp` CSP-header/nonce probe, `mta-sts` policy probe (a small `scripts/verify-worker.mjs` or per-step shell, decided in the plan; must be locally runnable).
- **Docs:** token/environment runbook (repo docs + CLAUDE.md worker section); fix stale `worker-csp/README.md`.
- **No changes** to `deploy.yml`, `e2e.yml`, or the workers' application code.

## Success criteria

- Merging a `worker*/` change produces an approval prompt; approving ships it; the deploy is verified at the edge.
- A failed verification auto-rolls-back (with backoff re-verify) and turns the run red — except across a DO migration, where it refuses and demands manual action.
- The nightly drift check fails loud with a specific reason when a deployed worker diverges from `main`, green when they match, and correctly classifies unstamped / out-of-repo SHAs.
- Only Cloudflare API credentials live in GitHub; the ungated drift job holds a read-only token; no platform secrets are stored.
