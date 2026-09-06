# Dependency and security housekeeping — 2026-09-06

## Scope

This sweep consolidated the stale root, social Worker, and CSP Worker Dependabot branches current on 2026-09-06. It resolves the updates proposed by #639, #640, #644, #646, #651, and #653 together against current `main` rather than relying on their earlier green checks. One proposed package, Playwright 1.62.1, was deliberately retained at 1.55.1 after local compatibility testing failed.

## Dependency outcome

- Root runtime and tooling packages were refreshed, including Vitest, ESLint, Preact, Satori, the GA Data client, and `node-html-parser`.
- Playwright remains exactly pinned at 1.55.1. With 1.62.1, the existing mobile long-journey regression test failed deterministically (three of three repetitions) because Chromium emitted `InvalidStateError: Transition was aborted because of invalid state` during the audio-card View Transition. Restoring 1.55.1 made the same test pass three of three times without changing the application or weakening the assertion. The upgrade should be retried separately, not smuggled into a grouped dependency merge.
- The production-transitive `fflate` graph is forced to patched `0.7.5`. This is broader than replaying #651: the newer Satori graph otherwise retained a second vulnerable `fflate@0.7.3` copy.
- Social Worker dependencies were refreshed; its audit is clean.
- CSP Worker dependencies were refreshed; a compatible `nanoid@3.3.18` override clears the newly adjacent transitive advisory while retaining the deliberately pinned Wrangler line.

## Audit baseline

The pre-sweep root audit reported 13 dependency-graph findings: 8 high, 4 moderate, and 1 low. The post-sweep state is:

| Graph         | All dependencies | Production only |
| ------------- | ---------------: | --------------: |
| Root site     |           6 high |               0 |
| Social Worker |                0 |               0 |
| CSP Worker    |                0 |               0 |

The six remaining root findings are not six independent production vulnerabilities. They are six nodes in one development-only Lighthouse chain:

```text
@lhci/cli
├─ @lhci/utils ─ lighthouse
└─ lighthouse ─ puppeteer-core ─ @puppeteer/browsers ─ extract-zip@2.0.1
```

The underlying unpatched condition remains `extract-zip` symlink traversal (GHSA-jmr9-qjv8-65gv), already watched in #625. `@lhci/cli` is a development dependency used by the manual Lighthouse workflow; none of this chain ships in the static site or either Worker. `npm audit --omit=dev` is clean. The audit-proposed forced change to `@lhci/cli@0.12.0` is a downgrade and does not provide a credible patched `extract-zip`, so it was not used to cosmetically reduce the count.

No findings were suppressed. Compatible overrides are recorded in the manifests and lockfiles.
