# Dependency remediation — 26 October 2026

Owner: dependency maintenance, #748. Starting main: `b8e1513`.

The integration branch preserves the commits from Dependabot PRs #727, #726,
#737, #739, #729, #728 and #743. It adds the remaining repairs and coverage;
the existing patches are tested together rather than assumed compatible from
their earlier individual checks.

## Dependency changes

- proxy-addr 2.0.8 and compression 1.8.2 in Lighthouse tooling.
- Vite 8.3.5 and source-map-js 1.2.2 in the social/CSP test tooling.
- Undici 7.30.1 in CSP/links tooling, with matching override floors.
- Vitest 4.1.12 in root/social/CSP; links retains its existing Vitest 5.
- body-parser 1.20.9 and postcss-selector-parser 7.1.7.
- Scoped get-uri → basic-ftp 6.2.3 override. The caller uses the retained
  Client/access/list/lastMod/downloadTo API. A local FTP integration check forced
  directory-listing fallback by rejecting MDTM and verified downloaded content
  and modification time.
- Scoped Cloudflare Vitest pool → Zod 4.6.7 override, staying on Zod 4. The CSP
  package tests exercise configuration loading with this override.
- Scoped Lighthouse → Puppeteer Core 25.16.0 override. Puppeteer 24's BiDi mapper
  requires vulnerable Zod 3; changing only that dependency to Zod 4 would cross
  its declared API contract. Updating Puppeteer supplies its matching mapper
  and browser tooling. Actual LHCI collection against the site build passed;
  the PR smoke job now repeats that integration check with its installed Chrome.

Puppeteer's new `@puppeteer/browsers` 3.2.6 uses `modern-tar` and removes
`extract-zip` from the dependency graph. **Neither extract-zip advisory has a
patched release.** Issue #625 retains that upstream history; removal of this
repository's dependency chain is distinct from a patch to extract-zip. No audit
exclusions, severity reductions or suppressed advisories are used.

## Verification before PR integration

Fresh npm 11 full (`--include=dev`) and production-only (`--omit=dev`) audits:

| Package | Full findings | Production findings |
| --- | ---: | ---: |
| root | 0 | 0 |
| worker | 0 | 0 |
| worker-csp | 0 | 0 |
| worker-links | 0 | 0 |

Local verification: root 217 tests, social 302 tests, CSP 34 tests and links
10 tests passed. All Worker TypeScript checks passed. Root Astro check, ESLint,
content validation, format check and production build passed. Root lockfile
also passed a fresh npm 11 clean installation. CI exposed npm 10 handling of
optional proxy-agent peers, so its lockfile was completed with the npm 10
installer used by Node 22 CI and checked with a clean-install dry run. Links
now declares its own Node 22 types for isolated test type-checking. A one-page LHCI collection ran
successfully with the updated Puppeteer and the existing Lighthouse version.

## Coverage and deployment

Dependabot now includes worker-links. The Dependency security workflow audits
all four lockfiles, including development dependencies at every severity, on
PRs, main pushes and a weekly schedule. It also installs, tests and type-checks
worker-links. Existing site/social/CSP checks remain in their existing jobs.

The Pages deploy job honours `PAGES_DEPLOY_HOLD=true`. That repository variable
must remain true through this integration's completed main workflow so merging
the security repairs cannot publish them. Restoring the variable after the
skipped deploy job does not replay the skipped deployment. Production release
requires separate authority; successful CI is not evidence of deployment.
