# UAT Report — 2026-02-12

## Summary
- Total checks: 15
- Passed: 11
- Failed: 3
- Warnings: 1

## Workstream A: Visual Polish
| Check | Result | Notes |
|-------|--------|-------|
| A1. CSS utilities defined | ✅ | `src/styles/global.css` defines `card-hover`, `hero-glow`, `section-divider`, `animate-in`, `header-scrolled`; reduced-motion block disables `card-hover` transform and `animate-in` animation (`src/styles/global.css:105`, `src/styles/global.css:138`). |
| A2. Homepage hero | ✅ | Hero section has `hero-glow`; `<h1>` has `animate-in`; both hero `<p>` tags use `animate-in` with delays `0.1s` and `0.2s`; section dividers exist between hero/Featured and Featured/Recent (`src/pages/index.astro:24`, `src/pages/index.astro:26`, `src/pages/index.astro:27`, `src/pages/index.astro:30`, `src/pages/index.astro:35`, `src/pages/index.astro:71`). |
| A3. Card depth (6 pages) | ✅ | Card `<a>` elements on `/`, `/projects/`, `/blog/`, `/blog/tag/[tag]/`, `/audio/`, `/gallery/` include `shadow-subtle hover:shadow-card card-hover` (`src/pages/index.astro:50`, `src/pages/index.astro:86`, `src/pages/projects/index.astro:47`, `src/pages/blog/index.astro:48`, `src/pages/blog/tag/[tag].astro:59`, `src/pages/audio/index.astro:29`, `src/pages/gallery/index.astro:42`). |
| A4. Header scroll shadow | ✅ | Header script includes `header.classList.toggle('header-scrolled', window.scrollY > 10)` and scroll listener uses `{ passive: true }` (`src/components/Header.astro:102`, `src/components/Header.astro:103`). |
| A5. Consent banner | ✅ | Consent banner inner wrapper includes `shadow-card` (`src/components/ConsentBanner.astro:12`). |

## Workstream B: Voice Rewrite
| Check | Result | Notes |
|-------|--------|-------|
| B1. Frontmatter integrity (17 files) | ✅ | All 17 target files parse as valid YAML frontmatter and include `title`, `description`, `tags`, `status`, `date`. |
| B2. Voice quality (5-file spot check) | ❌ | Word count passes (all 5 are >=100 words). Fails first-person criterion in `latent-self.md`, `tel3sis.md`, and `cygnet.md` (body text is mostly impersonal/third-person framing). Other style checks passed (no stack bullets, no `Built with ...` ending, em dash usage clean). |
| B3. Reference projects unchanged | ❌ | Git diff shows body changes in files expected unchanged: `src/content/projects/why-demonstrated-risk-is-ignored.md` and `src/content/projects/footnotes-at-the-edge-of-reality.md`. `afterglow-engine.md` is changed (allowed) and frontmatter remains intact. |
| B4. Blog + hero polish | ✅ | `hello-world.md` body is 156 words, opens with structural observation, and uses first-person voice. Homepage hero no longer repeats “Creative technologist” in both hero lines (`src/pages/index.astro`). `/about/` renders in build (`dist/about/index.html`). |

## Workstream C: Compliance Report
| Check | Result | Notes |
|-------|--------|-------|
| C1. Structure complete | ✅ | `docs/COMPLIANCE_REPORT.md` exists and contains all 9 required sections (numbered headings). Sections use ✅/⚠️/❌ ratings in status tables. |
| C2. Accuracy spot-checks (5 claims) | ✅ | `/analytics/` folder missing (as claimed); consent + GA4 gating confirmed (`src/components/ConsentBanner.astro`, `src/components/Analytics.astro`); JSON-LD Article type present (`src/components/SEOHead.astro:62`); no active R2 binding (`wrangler.toml:5`); RSS files exist (`src/pages/blog/rss.xml.ts`, `src/pages/audio/feed.xml.ts`). |
| C3. No code modified by compliance agent | ❌ | `git diff --name-only src/` lists many modified `src/` files in current worktree, so this condition is not met in the present state. `git diff --stat docs/` currently shows no unstaged docs changes. |

## Build Verification
| Check | Result | Notes |
|-------|--------|-------|
| Clean build | ✅ | `npm run build` completed with zero errors. |
| 21 project pages rendered | ✅ | `find dist/projects ... | wc -l` returns `21`. |
| `/index.html` renders | ✅ | `dist/index.html` exists after build. |

## Failed Items (if any)
1. `src/content/projects/latent-self.md`, `src/content/projects/tel3sis.md`, `src/content/projects/cygnet.md`
Expected: first-person narrative voice in each spot-checked rewrite.
Actual: primarily impersonal/third-person framing in body copy.
Remediation: revise openings and key body paragraphs to explicit first-person ownership (`I built`, `I wanted`, `I learned`) while preserving current structure.

2. `src/content/projects/why-demonstrated-risk-is-ignored.md`, `src/content/projects/footnotes-at-the-edge-of-reality.md`
Expected: body content unchanged from prior baseline.
Actual: files are modified per git diff.
Remediation: restore original body content for these two files or update acceptance criteria to allow rewrite scope expansion.

3. Repository-wide (`src/`)
Expected: no source-file modifications attributed to compliance pass.
Actual: multiple `src/` files are modified in current worktree.
Remediation: isolate compliance-report changes in a clean branch/commit and verify with `git diff --name-only src/` returning empty for compliance-only work.

Warning:
- Dev server runtime verification at `http://localhost:4321` could not be executed in this sandbox because `astro dev` failed to bind (`listen EPERM 127.0.0.1`). Route checks were validated via source inspection and successful production build output.
