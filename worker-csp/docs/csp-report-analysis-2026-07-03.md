# CSP Report-Only analysis — 2026-07-03

First analysis of violation reports collected by the `/__csp-report` endpoint
(#497 collector), per Sprint 37 / #473. Tracked here so the enforce-flip
decision has a written baseline.

## Data window

Workers Logs (`[observability]` on `adrianwedd-csp`) queried 2026-07-03 via
`POST /accounts/{id}/workers/observability/telemetry/query`, filter
`$metadata.service = adrianwedd-csp` + message `csp-violation`.

- **3 reports** in the retention window, all 2026-06-30, all from a single
  real visitor (iOS 18.7, Firefox for iOS 152).
- Query quirk: a 7-day window returned 0 events while a 72-hour window
  returned 3 (same filters, same day). Query narrow windows and widen
  stepwise; don't trust a single wide-window zero.

## Findings — both genuine, both fixed

The Report-Only header mirrors the enforced policy exactly, so every
`disposition: report` entry is also a request the **enforced** policy silently
blocked in production. Both findings are consented-GA4 data loss, not attacks:

| #    | Directive     | Blocked URL                                     | Cause                                                                                                                                              | Fix (csp.ts)                                                               |
| ---- | ------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1    | `connect-src` | `https://www.google.com/g/collect?...`          | gtag sends `/g/collect` beacons to `www.google.com` when ad-signal features are active; host was in `script-src`/`frame-src` but not `connect-src` | added `https://www.google.com` to `connect-src`                            |
| 2 ×2 | `img-src`     | `https://stats.g.doubleclick.net/g/collect?...` | gtag image-pixel fallback; `connect-src` trusted `*.g.doubleclick.net` but `img-src` only listed `googleads.g.doubleclick.net`                     | widened `img-src` to `https://*.g.doubleclick.net` (matches `connect-src`) |

Both traced to `sourceFile: https://www.googletagmanager.com/gtag/js?id=G-ET0FJJS7C7`.
No violations implicating site code (nonce misses, VT-injected scripts/styles,
Pagefind WASM, Turnstile) — the core policy is holding.

## Enforce-flip criteria

The enforced CSP has been live all along; the "flip" that remains is moving
the reporting directives onto the **enforced** policy and retiring the
Report-Only mirror (it duplicates a ~2 KB header on every HTML response).
Flip when both hold:

1. The two fixes above are deployed (`wrangler deploy` of worker-csp — manual).
2. **14 consecutive days** of Report-Only data show zero violations, ignoring
   browser-extension noise (`moz-extension://`, `chrome-extension://`,
   `blockedURL: inline` with an extension `sourceFile`).

Then: pass `reporting` to the enforced `buildCsp()` call in
`src/index.ts`, drop the Report-Only header, keep the collector and the
`Reporting-Endpoints` header. Violations keep flowing with
`disposition: enforce`.

Ongoing cadence after the flip: re-run this query after adding any new
third-party embed, and otherwise monthly. Retention is short — export
anything you want to keep the same week.
