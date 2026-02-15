# ROADMAP: adrianwedd.com

**Post-launch features.** Everything here was part of the original vision, reviewed by three models, and intentionally deferred — not forgotten.

---

## Sprint 1: Post-launch Maintenance ✅ (Completed Feb 15, 2026)

All 7 issues closed. [Milestone](https://github.com/adrianwedd/adrianwedd.com/milestone/1).

- ✅ [#25](https://github.com/adrianwedd/adrianwedd.com/issues/25) Analytics insights and optimization
- ✅ [#27](https://github.com/adrianwedd/adrianwedd.com/issues/27) Content expansion: Blog posts cadence
- ✅ [#29](https://github.com/adrianwedd/adrianwedd.com/issues/29) Performance monitoring (Lighthouse CI)
- ✅ [#30](https://github.com/adrianwedd/adrianwedd.com/issues/30) NotebookLM asset management improvements
- ✅ [#28](https://github.com/adrianwedd/adrianwedd.com/issues/28) Dependency maintenance (Dependabot)
- ✅ [#31](https://github.com/adrianwedd/adrianwedd.com/issues/31) Cleanup and asset organization
- ✅ [#26](https://github.com/adrianwedd/adrianwedd.com/issues/26) Infographics — closed (NotebookLM service timeout, low impact)

---

## Sprint 2: Content Depth & Polish ✅ (Completed Feb 15, 2026)

All 7 issues closed. [Milestone](https://github.com/adrianwedd/adrianwedd.com/milestone/2).

- ✅ [#37](https://github.com/adrianwedd/adrianwedd.com/issues/37) Table of contents for long-form content
- ✅ [#38](https://github.com/adrianwedd/adrianwedd.com/issues/38) Breadcrumb navigation on detail pages
- ✅ [#39](https://github.com/adrianwedd/adrianwedd.com/issues/39) Reading time and word count on blog posts
- ✅ [#40](https://github.com/adrianwedd/adrianwedd.com/issues/40) Project filtering and sorting on index page
- ✅ [#41](https://github.com/adrianwedd/adrianwedd.com/issues/41) ESLint + Prettier for code consistency
- ✅ [#42](https://github.com/adrianwedd/adrianwedd.com/issues/42) Blog content: publish 3 more posts
- ✅ [#43](https://github.com/adrianwedd/adrianwedd.com/issues/43) Gallery expansion: project screenshots and diagrams

---

## Sprint 3: Cross-Linking & Discovery ✅ (Completed Feb 15, 2026)

All 6 issues closed. [Milestone](https://github.com/adrianwedd/adrianwedd.com/milestone/3).

- ✅ [#44](https://github.com/adrianwedd/adrianwedd.com/issues/44) Related content suggestions on detail pages (already done in Sprint 2)
- ✅ [#45](https://github.com/adrianwedd/adrianwedd.com/issues/45) /now page — what I'm working on
- ✅ [#46](https://github.com/adrianwedd/adrianwedd.com/issues/46) Audio episode cross-links on project pages
- ✅ [#47](https://github.com/adrianwedd/adrianwedd.com/issues/47) Prev/next navigation on blog posts (already done in Sprint 2)
- ✅ [#48](https://github.com/adrianwedd/adrianwedd.com/issues/48) Project page audit: fill missing URLs and repos
- ✅ [#49](https://github.com/adrianwedd/adrianwedd.com/issues/49) Sitemap and robots.txt improvements (already complete)

---

## Sprint 4: Automation & Discovery ✅ (Completed Feb 15, 2026)

All 6 issues closed. [Milestone](https://github.com/adrianwedd/adrianwedd.com/milestone/4).

- ✅ [#50](https://github.com/adrianwedd/adrianwedd.com/issues/50) GitHub repo auto-discovery and explorable project tier
- ✅ [#51](https://github.com/adrianwedd/adrianwedd.com/issues/51) Smarter related content via tag co-occurrence
- ✅ [#52](https://github.com/adrianwedd/adrianwedd.com/issues/52) Individual gallery image pages with metadata
- ✅ [#53](https://github.com/adrianwedd/adrianwedd.com/issues/53) "Last updated" indicators on content pages
- ✅ [#54](https://github.com/adrianwedd/adrianwedd.com/issues/54) Keyboard shortcuts for power user navigation
- ✅ [#55](https://github.com/adrianwedd/adrianwedd.com/issues/55) Enhanced content scaffolding with AI-assisted metadata

---

## Sprint 5: Polish & Delight ✅ (Completed Feb 15, 2026)

All 6 issues closed. [Milestone](https://github.com/adrianwedd/adrianwedd.com/milestone/5).

- ✅ [#56](https://github.com/adrianwedd/adrianwedd.com/issues/56) Terminal/CLI easter egg
- ✅ [#57](https://github.com/adrianwedd/adrianwedd.com/issues/57) View source HTML comments and hidden messages
- ✅ [#58](https://github.com/adrianwedd/adrianwedd.com/issues/58) Smart gallery import with EXIF extraction
- ✅ [#59](https://github.com/adrianwedd/adrianwedd.com/issues/59) Build metadata and CI status on colophon
- ✅ [#60](https://github.com/adrianwedd/adrianwedd.com/issues/60) Temporal proximity in related content
- ✅ [#61](https://github.com/adrianwedd/adrianwedd.com/issues/61) Content versioning: archival timestamps and permalink preservation

---

## Sprint 6: Accessibility & Reach ✅ (Completed Feb 15, 2026)

All 6 issues closed. [Milestone](https://github.com/adrianwedd/adrianwedd.com/milestone/6).

- ✅ [#62](https://github.com/adrianwedd/adrianwedd.com/issues/62) Accessibility: focus traps, aria-live, and modal management
- ✅ [#63](https://github.com/adrianwedd/adrianwedd.com/issues/63) Mobile UX: auto-close menu and viewport height fix
- ✅ [#64](https://github.com/adrianwedd/adrianwedd.com/issues/64) Reading progress indicator for blog posts
- ✅ [#65](https://github.com/adrianwedd/adrianwedd.com/issues/65) Audio player: add skip forward/back buttons
- ✅ [#66](https://github.com/adrianwedd/adrianwedd.com/issues/66) Tag pages for projects and gallery
- ✅ [#67](https://github.com/adrianwedd/adrianwedd.com/issues/67) Print stylesheet for blog posts and project pages

---

## Post-Launch: Automation & Tooling

### NotebookLM Content Pipeline ✅
- ~~Assimilate key scripts from `../notebooklm`~~ — Done. Scripts now self-contained at `scripts/notebooklm/`
- Batch generation via `scripts/generate-all-notebook-assets.sh`
- Define input/output contract: source material in → Markdown/audio + frontmatter out
- Outputs are drafts — publish first, review later
- Pin tool versions, treat as optional enhancement (publishing works without it)

### GitHub Project Auto-Discovery
- `scripts/sync-repos.sh` — fetch repo metadata from GitHub API
- Auto-generate project stubs for undocumented repos
- Categorise by topic/language/activity
- Surface on project index as "explorable" second tier
- Cache API responses in `data/repos.json` (not live API calls during build)

### Build-Time Cross-Linking Enhancement
- Tag co-occurrence analysis for smarter "related content"
- Temporal proximity linking (content published around same time)

### Enhanced Content Scaffolding
- `scripts/new-post.sh` enhanced with AI-assisted metadata suggestion
- Gallery auto-import from directory watch
- Audio episode auto-scaffolding from file drop

---

## Post-Launch: Intelligence Layer

### SSR Personalisation
- Cloudflare Function middleware for SSR routes
- Segment detection: new vs returning, time of day, referral source
- Component variants based on segment
- Cookie-based return visitor recognition (consent-gated)

### Public Analytics Dashboard ✅
- ~~`/analytics/` route~~ — Done
- ~~Preact island consuming GA4 Data API~~ — Done (build-time fetch via `scripts/fetch-ga4-data.mjs`)
- ~~Aggregate metrics: traffic, popular content, geography, referral sources~~ — Done
- Build-time snapshot written to static JSON (GitHub Pages, no Functions/KV needed)
- No individual visitor data exposed
- ~~Style with same personality as the rest of the site~~ — Done

### Measurement Protocol
- Server-side GA4 events via Measurement Protocol
- Requires client ID passing from browser to server
- Only worth the complexity if specific server-side events are needed

### Generative Imagery
- Build-time generation of accent images per visitor segment
- Variant selection via SSR based on segment
- Pre-generated at build, not real-time API calls
- Image generation pipeline (local, using available tools)

---

## Post-Launch: Gallery Enhancements

### Individual Image Pages
- `/gallery/[collection]/[image]/` routes
- Full metadata, context, related work links
- EXIF data display (privacy-filtered: strip GPS, keep camera model + date)

### Smart Import Enhancement
- `scripts/import-gallery.sh` reads directory structure as collection hierarchy
- Extracts EXIF at import time (not request time)
- Auto-generates frontmatter from file metadata

---

## Post-Launch: Polish & Delight

### Progressive Disclosure
- Terminal/CLI easter egg (hidden interaction)
- View source messages
- Keyboard shortcuts for power users
- Hidden pages or routes for the curious

### Colophon ✅
- ~~`/colophon/` page: how the site was built~~ — Done
- ~~Build timestamp, dependency versions~~ — Done
- GitHub Actions build log integration
- "Last updated" indicators on content

### Search ✅
- ~~Pagefind integration (static, client-side, privacy-friendly)~~ — Done
- ~~Spans all content types~~ — Done (65 pages indexed)

### Build Metadata On-Site
- Build logs and pipeline status surfaced as content
- CI health indicators

---

## Post-Launch: Operations

### Lighthouse CI ✅
- ~~Run on every PR, block merges that regress performance~~ — Done (perf ≥0.9, a11y ≥0.9)

### Environment & Secrets
- Secret rotation strategy
- Environment configuration for preview vs production
- Error monitoring (Cloudflare Analytics + GA4)

### Content Versioning
- Archival strategy for evolving content
- Permalink preservation
- "As of [date]" timestamping

---

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| GA4 over first-party analytics | Showcases GA4 mastery, sufficient for needs | 2026-02-12 |
| NotebookLM outputs publish first, review later | Reduces friction, aligns with charter 3.5 | 2026-02-12 |
| Collections sufficient for gallery (no per-image pages at launch) | Reduces Phase 2 scope by ~40% for gallery | 2026-02-12 |
| Client-side personalisation only for launch | Eliminates SSR/Functions complexity and GDPR edge cases | 2026-02-12 |
| Deferred public analytics dashboard | High complexity, low visitor value at launch | 2026-02-12 |
| Deferred generative imagery | Build complexity for marginal launch impact | 2026-02-12 |
| Deferred GitHub auto-discovery | Manual curation of 10-15 projects is better for launch quality | 2026-02-12 |

---

**Nothing here is cancelled. It's sequenced.**

---
