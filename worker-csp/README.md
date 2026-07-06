# adrianwedd-csp worker

Edge worker that injects per-request CSP nonces into HTML responses for `adrianwedd.com`.

## Why this exists

The site's build-time meta CSP in `src/components/SEOHead.astro` carries `'unsafe-inline'`, which negates most of the XSS mitigation the rest of the policy buys. A previous attempt at hash-based CSP via Astro's `experimental.csp` (#222) broke the static build (#241), and the now-stable Astro 6 `security.csp` documents ClientRouter (View Transitions) and Shiki as unsupported — both load-bearing on this site — so hashing stays off the table (#473, decided 2026-07-03). The meta CSP remains as a risk-accepted fallback for worker-bypass paths only; keep its host lists in sync with `src/csp.ts`.

Nonces at the edge sidestep both problems: the worker generates a fresh random nonce per request, attaches it to every `<script>` and `<style>` tag via HTMLRewriter, and emits a real `Content-Security-Policy` response header (so `frame-ancestors` actually works).

## Status

**Deployed and live.** Bound to `adrianwedd.com/*` (and `www.adrianwedd.com/*`, which it 301s to the apex) via the routes in `wrangler.toml`, with `STRICT_DYNAMIC=1`. Deployed via
`.github/workflows/worker-deploy.yml` — see `docs/runbooks/worker-deploy.md`.

## Deploy checklist

1. Review `src/csp.ts` — make sure every external origin currently used by the site is in the policy. Missing one will block its scripts/images/connects.
2. `cd worker-csp && npm install && npm test` — all green.
3. `npx wrangler deploy --dry-run`, then `npx wrangler deploy`.
4. Watch the `/__csp-report` Report-Only stream (`wrangler tail`) for new violations after any policy change.

Note: the build-time meta CSP in `src/components/SEOHead.astro` is retained as a risk-accepted fallback for worker-bypass paths (see Why this exists) — keep its host lists in sync with `src/csp.ts`.

## `STRICT_DYNAMIC`

It is `"1"` in production. Setting it to `1` adds `'strict-dynamic'` to `script-src`, which:

- Lets the nonce-loaded scripts grant transitive trust (cleaner policy).
- **Disables the host allowlist** in `script-src` — every external script then has to be loaded via a nonced inline trampoline, not via `<script src="…">`.

This is the failure mode that broke #241. It was flipped only after every external script (`googletagmanager`, `licdn`, `cloudflare/turnstile`, etc.) was verified to load via a nonced loader, not a host-allowlisted `<script src>` — any newly added external script must follow the same pattern.

## Why a separate worker (not folded into `worker/`)

The existing `worker/` runs `social.adrianwedd.com` (Facebook automation). This one binds to `adrianwedd.com/*` and does HTML rewriting. Different hostnames, different routes, different blast radius — cleaner to keep them isolated.

## Local integration test

`npm run build` from the repo root, then `cd worker-csp && ./scripts/integration-test.sh`. Boots `python -m http.server` against `../dist/` and `wrangler dev` with `ORIGIN_HOST` pointed at it, then curls representative URLs and asserts that HTML responses carry a `Content-Security-Policy` header whose nonce matches the nonce attached to `<script>` tags in the body, and that the build-time meta CSP is stripped.

## Past blockers (resolved before bind)

- **Self-recursion** — `ORIGIN_HOST` env var decouples the upstream host from the worker's route hostname. Production points at `adrianwedd.github.io`; integration test points at `localhost`.
- **Real-build integration coverage** — `scripts/integration-test.sh` replaces the vitest-pool-workers approach that miniflare couldn't host (cross-package `?raw` imports).
- **`style-src` split** — `style-src-elem` requires the nonce; `style-src-attr` keeps `'unsafe-inline'` for Astro's dynamic `style="…"` attrs; legacy `style-src` remains as a fallback for browsers that don't honour the split.

## Ongoing care

- **Watch the Report-Only stream** — the `/__csp-report` collector logs violations from the parallel Report-Only header; check it after adding any external script/style/connect origin.
