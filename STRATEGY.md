# STRATEGY.md

Read this before any task. It overrides your judgment. Entries are labeled
OBSERVED (explicit in code/history) or INFERRED (probable; evidence stated).

## 1. INTENT

Content is the product; code exists only to publish it safely. This repo is
Adrian Wedd's personal site (Astro 6 static, GitHub Pages) plus its publishing
pipeline: Cloudflare Workers (`worker/` social automation, `worker-csp/`,
`worker-mta-sts/`) and NotebookLM media-kit tooling (`scripts/notebooklm/`).
"Done" for any change = the CI-equivalent gates pass, published URLs remain
stable, and nothing is published to any external platform without explicit
instruction.

Deliberately NOT: server-rendered (fully static; the CSP worker only rewrites
at the edge); a place for secrets (GitHub secrets / wrangler secrets /
gitignored files only); framework-everywhere (islands only); auto-deployed
workers (CI deploys the site only; workers deploy manually). OBSERVED
throughout config and CI.

## 2. INVARIANTS

Forbidden first. Each names the "helpful improvement" that violates it.

- Never rename, move, or delete a published content file in `src/content/` —
  filename = permanent URL. The "helpful" slug/typo cleanup breaks permalinks.
  URL changes require a redirect in `astro.config.mjs` + explicit approval.
  OBSERVED (CLAUDE.md permalink policy, redirects in astro.config.mjs).
- Never compress, re-encode, or "optimize" published audio/video. Audio ships
  at NLM original quality (256k AAC in MP4, named `.m4a`); videos are muxed
  with `-c copy`. The "helpful" file-size optimization destroys irreplaceable
  takes — deleted notebooks can't re-issue the same narration. Never delete
  generated media on your own judgment. OBSERVED (CLAUDE.md, repeated user
  directives in history).
- Never set `autopublish: true` on content that was hand-posted or has
  `date` ≥ today unless explicitly told — the social pipeline fires on `date`
  and will re-broadcast. The "helpful" frontmatter normalization posts to
  Facebook/Twitter/Bluesky for real. OBSERVED (social-autopublish.yml +
  incident history).
- Never use Tailwind's `dark:` prefix; theming is CSS custom properties in
  `src/styles/global.css`. The "helpful" idiomatic-Tailwind refactor breaks
  light mode. OBSERVED (CLAUDE.md).
- Never emit a raw `<img>` for a local path — use `<Picture>` from
  `astro:assets`. CI gate fails the deploy. OBSERVED (deploy.yml gate).
- Every `.webp` heroImage must have a `.jpg` twin at the same path in
  `public/`. Local build passes without it; only CI catches it — this broke
  main twice. OBSERVED (deploy.yml gate + commit history #420/#425).
- Content descriptions ≤ 160 chars; all frontmatter must pass
  `node scripts/validate-content.js`. OBSERVED (script + CI).
- Never generate an href from a collection ID without `slug()` from
  `src/lib/utils.ts` — Astro 6 IDs include `.md`. The "helpful" direct
  `entry.id` interpolation 404s. OBSERVED (CLAUDE.md + utils.ts).
- Interactive scripts must follow the View Transitions pattern (is:inline +
  `documentElement.dataset` sentinel + event delegation + lazy lookups +
  `astro:after-swap` inside the guard). `Analytics.astro`'s bare module
  `<script>` is a deliberate exception — do not "align" it with the pattern.
  OBSERVED (CLAUDE.md + component code).
- No tracking before consent: keep `dns-prefetch` (not `preconnect`) for GA4
  origins. The "helpful" preconnect perf tweak opens connections pre-consent.
  OBSERVED (CLAUDE.md + Analytics.astro).
- No custom fonts — system stack only. Do not add font files, `@font-face`,
  Google Fonts, Adobe Fonts, or font preconnects. OBSERVED (CLAUDE.md).
- The `overrides` block in `package.json` is load-bearing: it pins transitive
  deps to pass CI's `npm audit --audit-level=high --omit=dev` gate. The
  "helpful" removal of "unused" overrides re-breaks the deploy. New audit
  failures are fixed by adding overrides, never by downgrading Astro.
  OBSERVED (commits #471, #480, #489).
- The worker's idempotency + `CronLock` Durable Object logic is load-bearing:
  `forceRetry` bypasses `failed` records but never `published`; the DO closes
  a KV TOCTOU window; `release()` requires the fencing token. The "helpful"
  simplification to plain KV get/put re-opens double-posting. OBSERVED
  (CLAUDE.md + worker code/tests).
- Never commit `src/data/base-cv.json`, `.dev.vars`, `.env*`, or NLM auth
  profiles. They are gitignored/synced for a reason. OBSERVED (.gitignore,
  deploy.yml CV sync).
- Do not delete branches you didn't create — auto-draft branches hold
  unmerged content. INFERRED (content-pipeline.yml creates draft branches;
  prior sessions harvested them).
- Do not "fix" `.lychee.toml` exclusions — own-domain and social-domain
  exclusions are deliberate (pre-deploy 404s, bot-blocked sites). OBSERVED
  (comments in .lychee.toml).
- `public/og/blog/` text-card PNGs are committed on purpose;
  `generate-og-images.mjs` deliberately skips posts with a heroImage. Do not
  "backfill" cards for heroImage posts or gitignore the directory. OBSERVED
  (script comments + CLAUDE.md).

## 3. DECISIONS & GRAVEYARD

Executors never relitigate these.

- Static GitHub Pages + edge CSP worker, not SSR: `worker-csp` injects
  per-request nonces. Rejected: meta-tag CSP hashing (deferred pending owner
  decision; revisit only if the owner asks). OBSERVED (#497, worker-csp/).
- Lighthouse CI is manual (`workflow_dispatch`) since #488; a PR showing
  Lighthouse "skipping" is CORRECT, not broken. Run locally via
  `npm run build && npm run lighthouse`. Rejected: per-PR runs (flaky/slow).
  OBSERVED (#488, lighthouse.yml).
- Validation gates run on PRs too since #503, because green PRs previously
  broke main. `npm run verify` mirrors them locally. OBSERVED (#503,
  deploy.yml).
- OG image dimensions come from a build-time file-header parser
  (`src/lib/image-dimensions.ts`), replacing a mis-sizing filename heuristic.
  Never import it into a Worker — it uses `node:fs`. OBSERVED (CLAUDE.md +
  code).
- Media (audio/video) live on Cloudflare R2 at `cdn.adrianwedd.com`;
  infographics stay in git. Rejected: all-in-git (bloat) and all-on-R2
  (heroes need build-time processing). OBSERVED (CLAUDE.md,
  upload scripts). Video distribution goes to YouTube, not social attachments
  — platform size caps make worker video delivery impossible. OBSERVED
  (worker platform code, upload-videos-to-youtube.py).
- `repo:` frontmatter was removed from 5 projects because those repos are
  private (lychee 404s). Revisit trigger: repos go public. OBSERVED
  (.lychee.toml exclusions + history).
- Social queue seed is `social/facebook-posts.json` but KV is authoritative
  after sync. Editing the JSON alone changes nothing live. OBSERVED
  (worker /api/queue/sync).
- Search is Pagefind (build-time index); hosted search rejected. INFERRED
  from the static/zero-runtime-JS philosophy applied consistently.
- CLAUDE.md's "four collections" is stale: `src/content.config.ts` defines
  six (blog, projects, gallery, audio, fixes, case-studies). Trust the code.
  OBSERVED (content.config.ts:124).

## 4. FAILURE MODES

- Green local build ≠ green deploy. The jpg-twin, raw-`<img>`, audit, lychee,
  and internal-link gates run in CI. Tell: you touched a heroImage, image
  markup, or dependencies and only ran `npm run build`. Run `npm run verify`.
- Editing frontmatter dates/flags on existing content. Tell: any diff to
  `date` or `autopublish` on a published file — this can re-fire social posts.
- Treating untracked repo-root files as litter. Treat ANY untracked root file
  as hazardous unless your current task created it — never commit, delete, or
  build on one; escalate. Known strays as of 2026-07-02: `diff.txt`,
  `modify_config.py`, `put_payload.json`, `tunnel_config.json` (exposes a
  live Cloudflare tunnel ID and home-LAN topology), `TOMORROW.md`.
  OBSERVED (untracked, unrelated to the site).
- Assuming merged worker code is deployed. Workers deploy manually. Tell:
  claiming a worker fix is "live" after merge without a `wrangler deploy`.
- Trusting CLAUDE.md/AGENTS.md/GEMINI.md over the code or this file — parts
  are stale (collection count; an old 64k-audio step). If code, CLAUDE.md,
  and this file conflict with EACH OTHER, stop and report the drift unless
  the task explicitly resolves it.
- Running two `nlm` CLI processes concurrently (token-file race), or using
  the NLM MCP instead of the CLI. Tell: parallel nlm invocations in one step.
- "Cleaning up" `dist/` into git or formatting sweeps across `src/content/`
  producing giant content diffs unrelated to the task.

## 5. ESCALATION TRIGGERS — full stop, ask the human

- Anything touching secrets/auth: `.dev.vars`, `.env*`, GA4 keys,
  `PIPELINE_PAT`, `PUBLISH_SECRET`/`CLI_SECRET`, NLM cookies, YouTube OAuth.
- Any non-dry-run `wrangler deploy` (all three workers) — the `--dry-run` in
  Verification step 7 is allowed. Also: KV/R2/DO mutations, DNS/email config,
  Cloudflare API calls (even reads — the account holds non-site
  infrastructure).
- Any call to `social.adrianwedd.com` endpoints, `fb-post.sh`, queue sync, or
  frontmatter changes that could trigger autopublish — these post publicly.
- Deleting/renaming anything in `src/content/`, `public/notebook-assets/`,
  `public/og/`, or any generated media; adding redirects.
- NotebookLM generation runs (daily quota ~50/type; dedicated-account ToS
  risk) and YouTube uploads.
- Any untracked repo-root file you didn't create (see Section 4).
- Changes to `deploy.yml` gates, branch protection, or `.lychee.toml`.
- Any ambiguity between this file, CLAUDE.md, and the code; any task that
  seems to require violating Section 2.

## 6. VERIFICATION (in order)

1. `node scripts/validate-content.js` → exits 0, no errors listed.
2. `npx astro check` → 0 errors.
3. `npm run lint` → 0 errors.
4. `npm run verify` → exits 0. This mirrors CI: check + validate + build +
   `scripts/test-site.sh` + internal-link check. Slow but required before
   claiming done.
5. If any `src/content/` filename, any slug, a collection definition, or a
   redirect changed: list the before/after URL impact and escalate before
   committing. No automated check exists for this.
6. If you touched a `.webp` heroImage: confirm the `.jpg` twin exists at the
   same path under `public/` (`ls public/<path>.jpg`).
7. If you touched `worker/`: `cd worker && npm test` → all pass, then
   `npx wrangler deploy --dry-run` → succeeds (dry-run is allowed; actual
   deploy is not).
8. If you touched `worker-csp/`: `cd worker-csp && npm test && npx tsc
   --noEmit` → all pass.
9. `npm run format:check` → clean (or format only the files you changed).

No automated check exists for social re-broadcast safety or media quality —
review the diff against Section 2 and escalate on any doubt.
