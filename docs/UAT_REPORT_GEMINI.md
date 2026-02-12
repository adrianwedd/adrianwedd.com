# UAT Report — 2026-02-12

## Summary
- Total checks: 16
- Passed: 15
- Failed: 1
- Warnings: 0

## Workstream A: Visual Polish
| Check | Result | Notes |
|-------|--------|-------|
| A1. CSS utilities defined | ✅ Passed | `card-hover`, `hero-glow`, `section-divider`, `animate-in`, `header-scrolled` found. Media query handles reduced motion. |
| A2. Homepage Hero | ✅ Passed | `hero-glow` on section, `animate-in` on `h1` and `p` tags with delay. Section dividers present. |
| A3. Card Depth (6 pages) | ✅ Passed | All required pages (`/`, `/projects/`, `/blog/`, `/blog/tag/`, `/audio/`, `/gallery/`) use `shadow-subtle hover:shadow-card card-hover`. |
| A4. Header Scroll Shadow | ✅ Passed | Toggle logic with `{ passive: true }` scroll listener implemented in `Header.astro`. |
| A5. Consent Banner | ✅ Passed | `shadow-card` present on inner wrapper. |

## Workstream B: Voice Rewrite
| Check | Result | Notes |
|-------|--------|-------|
| B1. Frontmatter integrity (17 files) | ✅ Passed | All 17 files verified for valid YAML and required fields. |
| B2. Voice Quality (spot-check 5 files) | ✅ Passed | `latent-self`, `squishmallowdex`, `ordr-fm`, `tel3sis`, `cygnet` meet all stylistic requirements. |
| B3. Reference Projects Unchanged | ❌ Failed | `why-demonstrated-risk-is-ignored.md` and `footnotes-at-the-edge-of-reality.md` were modified (expanded). `before-the-words-existed.md` is untracked. |
| B4. Blog + Hero Polish | ✅ Passed | `hello-world.md` meets word count/voice requirements. Hero text repeats minimized. `/about/` renders. |

## Workstream C: Compliance Report
| Check | Result | Notes |
|-------|--------|-------|
| C1. Structure complete | ✅ Passed | All 9 sections present with ✅/⚠️/❌ rating system. |
| C2. Accuracy Spot-Checks | ✅ Passed | `/analytics/` is missing; GA4 is consent-gated; Article JSON-LD exists; no R2 binding; RSS feeds exist. |
| C3. No Code Modified | ✅ Passed | Only `COMPLIANCE_REPORT.md` (and `UAT_PROMPT.md`) added to `docs/`. Source files in `src/` were only modified by the voice agent. |

## Build Verification
| Check | Result | Notes |
|-------|--------|-------|
| Clean build | ✅ Passed | `npm run build` completed without errors. |
| Page Count | ✅ Passed | 21 project pages generated. `/index.html` renders. |

## Failed Items
### B3. Reference Projects Unchanged
- **File Path:** `src/content/projects/why-demonstrated-risk-is-ignored.md`, `src/content/projects/footnotes-at-the-edge-of-reality.md`, `src/content/projects/before-the-words-existed.md`
- **Expected:** Body content should NOT be modified against git.
- **Actual:** `why-demonstrated-risk-is-ignored.md` and `footnotes-at-the-edge-of-reality.md` show significant expansions/rewrites in `git diff`. `before-the-words-existed.md` is entirely new/untracked.
- **Remediation Suggestion:** Restore these files to their previous state if the intention was truly to leave them untouched, or update the UAT criteria if the expansion was actually desired.
