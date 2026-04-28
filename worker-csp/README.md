# adrianwedd-csp worker

Edge worker that injects per-request CSP nonces into HTML responses for `adrianwedd.com`.

## Why this exists

The site's build-time meta CSP in `src/components/SEOHead.astro` carries `'unsafe-inline'`, which negates most of the XSS mitigation the rest of the policy buys. A previous attempt at hash-based CSP via Astro's `experimental.csp` (#222) broke the static build (#241).

Nonces at the edge sidestep both problems: the worker generates a fresh random nonce per request, attaches it to every `<script>` and `<style>` tag via HTMLRewriter, and emits a real `Content-Security-Policy` response header (so `frame-ancestors` actually works).

## Status

**Not deployed.** Routes are commented out in `wrangler.toml`. The worker passes its tests but needs a soak window in staging before being bound to the production hostname.

## Deploy plan (when ready)

1. Review `src/csp.ts` — make sure every external origin currently used by the site is in the policy. Missing one will block its scripts/images/connects.
2. `cd worker-csp && npm install && npm test` — all green.
3. Pick a staging hostname (or use a query-param header bypass) for soak testing. Bind the worker. Confirm:
   - Preact hydration works (no console CSP violation reports)
   - Theme toggle, hero canvas, code-copy, ConsentBanner, GA4, LinkedIn Insight all functional
   - `securityheaders.com` scan goes B → A or A+
4. Once stable on staging, uncomment the production routes in `wrangler.toml` and deploy.
5. Remove the build-time meta CSP from `src/components/SEOHead.astro` (worker will strip it anyway, but cleaner).

## When to flip `STRICT_DYNAMIC=1`

Default is `0`. Setting it to `1` adds `'strict-dynamic'` to `script-src`, which:

- Lets the nonce-loaded scripts grant transitive trust (cleaner policy).
- **Disables the host allowlist** in `script-src` — every external script then has to be loaded via a nonced inline trampoline, not via `<script src="…">`.

This is the failure mode that broke #241. Don't flip it until every external script (`googletagmanager`, `licdn`, `cloudflare/turnstile`, etc.) is verified to load via a nonced loader, not a host-allowlisted `<script src>`.

## Why a separate worker (not folded into `worker/`)

The existing `worker/` runs `social.adrianwedd.com` (Facebook automation). This one binds to `adrianwedd.com/*` and does HTML rewriting. Different hostnames, different routes, different blast radius — cleaner to keep them isolated.

## Open work before deploy

- **Self-recursion**: `fetch(request)` in `src/index.ts` re-enters the worker if both apex and `www.` routes are bound. Before binding, either rewrite the URL to a dedicated origin host (e.g. `adrianwedd.github.io`) or set a sentinel header + early-return. (#253 / Claude QA 2026-04-28.)
- **Real-build integration test**: The vitest unit suite uses synthetic HTML fixtures. Real-build coverage (feeding actual `dist/*.html` through the worker) was attempted as a vitest-pool-workers test but `?raw` imports of files outside the package boundary aren't supported by miniflare's module loader. Lift this as a soak-time bash script: `wrangler dev` + `python -m http.server` against `dist/`, curl representative URLs, assert nonce + CSP header. (Codex QA 2026-04-28.)
- **`style-src-attr` / `style-src-elem` split**: Currently `style-src 'self' 'unsafe-inline'` covers both inline `<style>` elements (which the worker nonces) and `style="…"` attributes (which it can't). Split lets us require nonce on elements and keep `'unsafe-inline'` only for attrs. Astro emits dynamic `style="animation-delay:…"` attrs so attr `'unsafe-inline'` must remain.
