# UAT Agent Prompt: Visual Polish + Voice Rewrite + Compliance Report

You are a UAT agent verifying three workstreams against their acceptance criteria on the site at `http://localhost:4321`. The codebase is at `/Users/adrian/repos/adrianwedd.com`.

Start the dev server with `npm run dev` in the background before beginning.

---

## Workstream A: Visual Polish

### A1. CSS Utilities Exist
- Read `src/styles/global.css` and confirm these classes are defined: `card-hover`, `hero-glow`, `section-divider`, `animate-in`, `header-scrolled`
- Confirm `@media (prefers-reduced-motion: reduce)` block disables `card-hover` transform and `animate-in` animation

### A2. Homepage Hero
- Navigate to `/`
- Confirm the hero `<section>` has class `hero-glow`
- Confirm `<h1>` has class `animate-in`
- Confirm both `<p>` tags have `animate-in` with staggered `animation-delay` (0.1s, 0.2s)
- Confirm at least one `<div class="section-divider ...">` exists between hero and Featured Work, and between Featured Work and Recent Writing

### A3. Card Depth (6 pages)
For each of these pages, confirm every card `<a>` element has `shadow-subtle hover:shadow-card card-hover` in its class list:
- `/` (featured project cards + recent post cards)
- `/projects/`
- `/blog/`
- `/blog/tag/meta/` (or any existing tag page)
- `/audio/`
- `/gallery/`

### A4. Header Scroll Shadow
- Navigate to `/`
- Read `src/components/Header.astro` and confirm the `<script>` block contains `header.classList.toggle('header-scrolled', window.scrollY > 10)`
- Confirm the scroll listener uses `{ passive: true }`

### A5. Consent Banner
- Read `src/components/ConsentBanner.astro` and confirm the inner wrapper `<div>` has `shadow-card` in its classes

---

## Workstream B: Voice Rewrite

### B1. Frontmatter Integrity
For ALL 17 rewritten project files listed below, read each file and confirm:
- Frontmatter (everything between `---` fences) is syntactically valid YAML
- `title`, `description`, `tags`, `status`, `date` fields are all present
- No frontmatter fields were removed or corrupted

Files: `adhdo.md`, `agentic-index.md`, `cv.md`, `cygnet.md`, `dodgylegally.md`, `dx0.md`, `failure-first.md`, `home-assistant-obsidian.md`, `latent-self.md`, `orbitr.md`, `ordr-fm.md`, `rlm-mcp.md`, `squishmallowdex.md`, `space-weather.md`, `tanda-pizza.md`, `tel3sis.md`, `this-wasnt-in-the-brochure.md`

All in `src/content/projects/`.

### B2. Voice Quality (spot-check 5 files)
Read these 5 rewritten files and for each confirm:
- Body is >= 100 words
- Opens with a structural insight or personal stake (not a feature list)
- First-person voice ("I built...", "I wanted...", not third-person)
- No "Built with [stack]" ending pattern
- No tech stack enumeration as bullet list
- No corporate buzzwords or achievement listing
- Em dashes without spaces (use — not " — " or "--")
- Closing sentence is earned (connects back to the piece's argument)

Spot-check files: `latent-self.md`, `squishmallowdex.md`, `ordr-fm.md`, `tel3sis.md`, `cygnet.md`

### B3. Reference Projects Unchanged
Read these 3 files and confirm their body content was NOT modified (check against git):
- `why-demonstrated-risk-is-ignored.md`
- `before-the-words-existed.md`
- `footnotes-at-the-edge-of-reality.md`

Exception: `afterglow-engine.md` was intentionally expanded (this is acceptable if frontmatter is intact).

Run `git diff --name-only src/content/projects/why-demonstrated-risk-is-ignored.md src/content/projects/before-the-words-existed.md` to check.

### B4. Blog + Hero Polish
- Read `src/content/blog/hello-world.md` — confirm body is >= 80 words, opens with a structural observation, maintains first-person voice
- Read `src/pages/index.astro` — confirm hero text no longer repeats "Creative technologist" in both lines
- Confirm `about.astro` renders without errors at `/about/`

---

## Workstream C: Compliance Report

### C1. File Exists and Structure
- Confirm `docs/COMPLIANCE_REPORT.md` exists
- Confirm it contains all 9 required sections: Routing, Architecture, Content Pipeline, Design System, Analytics & Intelligence, Privacy, SEO, Content Inventory, Performance
- Confirm each section uses the rating system: ✅ Implemented, ⚠️ Partial, ❌ Missing

### C2. Accuracy Spot-Checks (verify 5 claims against actual codebase)
1. **Report claims `/analytics/` is ❌ Missing** — Run `ls src/pages/analytics/` — confirm it does not exist
2. **Report claims consent is ✅ Implemented** — Read `src/components/ConsentBanner.astro` and confirm consent-gated GA4 loading exists in `src/components/Analytics.astro`
3. **Report claims JSON-LD Article is ✅** — Grep for `"@type"` in `src/components/SEOHead.astro` and confirm Article type exists
4. **Report claims no R2 binding** — Read `wrangler.toml` and confirm R2 binding is commented out or absent
5. **Report claims RSS feeds exist** — Confirm files exist: `src/pages/blog/rss.xml.ts` and `src/pages/audio/feed.xml.ts`

### C3. No Code Modified
- Run `git diff --stat docs/` — confirm only `COMPLIANCE_REPORT.md` was added/modified in `docs/`
- Confirm no source files in `src/` were modified by the compliance agent

---

## Build Verification

- Run `npm run build` — must complete with zero errors
- Confirm all 21 project pages render (count `/projects/*/index.html` in build output)
- Confirm `/index.html` renders

---

## Output Format

Produce a report with this structure:

```
# UAT Report — [date]

## Summary
- Total checks: [N]
- Passed: [N]
- Failed: [N]
- Warnings: [N]

## Workstream A: Visual Polish
| Check | Result | Notes |
|-------|--------|-------|
| A1. CSS utilities defined | ✅/❌ | ... |
| ... | ... | ... |

## Workstream B: Voice Rewrite
| Check | Result | Notes |
|-------|--------|-------|
| B1. Frontmatter integrity (17 files) | ✅/❌ | ... |
| ... | ... | ... |

## Workstream C: Compliance Report
| Check | Result | Notes |
|-------|--------|-------|
| C1. Structure complete | ✅/❌ | ... |
| ... | ... | ... |

## Build Verification
| Check | Result | Notes |
|-------|--------|-------|
| Clean build | ✅/❌ | ... |

## Failed Items (if any)
[Details of each failure with file path, expected vs actual, remediation suggestion]
```

Write the report to the specified output file.
