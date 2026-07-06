# Worker deploy runbook

`.github/workflows/worker-deploy.yml` auto-deploys the three workers on merge to
`main` (path-filtered), behind an approval gate, with edge verification,
auto-rollback, and a nightly drift check.

## One-time setup (required before first CI deploy)

1. **Create `CLOUDFLARE_API_TOKEN`** — Cloudflare dashboard → My Profile → API
   Tokens → Create Token. Permissions: **Account → Workers Scripts → Edit** and
   **Account → Account Settings → Read**. Add **Zone → Workers Routes → Edit**
   and **Zone → DNS → Edit** only if CI must ever (re)create the `worker-csp`
   route or the `mta-sts` custom domain (all three already exist, so redeploys
   don't need zone scopes).
2. **Create `CLOUDFLARE_API_TOKEN_READONLY`** — same flow, permission
   **Account → Workers Scripts → Read** only.
3. **Add repo secrets** `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN_READONLY`
   (Settings → Secrets and variables → Actions → repository secrets).
4. **Create the `worker-production` environment** (Settings → Environments):
   add **required reviewer = Adrian**, then add `CLOUDFLARE_API_TOKEN` as an
   **environment** secret scoped to it.

## Flow

- **push to main** touching `worker*/` → `deploy` job pauses for approval →
  approve → deploy + verify at the edge → auto-rollback on failure.
- **nightly** → `drift-check` compares each deployed worker's stamped `gitsha:`
  against `main` and fails red on divergence.
- **manual** → Actions → Worker Deploy → Run workflow → choose `mode`
  (`deploy` a `target`, or `drift-only` for a read-only check).

## Limitations

- Rollback targets the explicit pre-deploy version. If wrangler refuses (a
  Durable Object migration or a changed secret can block it), the run prints
  "MANUAL INTERVENTION REQUIRED" and leaves the failed version live — roll back
  by hand. Only `worker/` has a Durable Object migration.
- `/api/health` verification is a liveness probe; token health is owned by
  `social-token-alert.yml`.
