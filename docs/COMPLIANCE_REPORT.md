# Compliance Report: adrianwedd.com

**Generated:** 2026-02-12
**Evaluated against:** `docs/PROJECT_SPEC.md`, `docs/DESIGN_CHARTER.md`, `README.md`
**Scope:** Live codebase audit — read-only analysis of `src/`, `scripts/`, `public/`, config files

---

## 1. Routing

Spec defines the following site map. Evaluated against `src/pages/`.

| Route | Spec | Status |
|-------|------|--------|
| `/` (Home) | Hero + featured work + recent activity | ✅ Implemented — `src/pages/index.astro` renders Personalisation island, featured projects grid, recent blog posts |
| `/projects/` | Project index (filterable grid) | ⚠️ Partial — `src/pages/projects/index.astro` exists with tag display, but tags are static `<span>` elements with no client-side filtering logic |
| `/projects/[slug]/` | Individual project showcase | ✅ Implemented — `src/pages/projects/[...slug].astro` with full detail layout, related content, NotebookAssets |
| `/blog/` | Blog index (chronological, tagged) | ✅ Implemented — `src/pages/blog/index.astro` |
| `/blog/[slug]/` | Individual post | ✅ Implemented — `src/pages/blog/[...slug].astro` with reading time, prev/next nav, related content |
| `/blog/tag/[tag]/` | Tag index | ✅ Implemented — `src/pages/blog/tag/[tag].astro` |
| `/gallery/` | Image gallery (filterable) | ⚠️ Partial — `src/pages/gallery/index.astro` exists with tag/medium display but no interactive filtering |
| `/gallery/[collection]/` | Gallery collection | ✅ Implemented — `src/pages/gallery/[...slug].astro` |
| `/gallery/[collection]/[image]/` | Individual image page | ❌ Missing — no nested image route exists; gallery detail is per-collection only |
| `/audio/` | Audio index | ✅ Implemented — `src/pages/audio/index.astro` |
| `/audio/[slug]/` | Individual episode | ✅ Implemented — `src/pages/audio/[...slug].astro` |
| `/about/` | About/CV | ✅ Implemented — `src/pages/about.astro` with privacy section, Transparency island, linked work |
| `/analytics/` | Public analytics dashboard | ❌ Missing — no page exists at `src/pages/analytics/` |
| `/colophon/` | How the site was built | ❌ Missing — no page exists at `src/pages/colophon/` |

**Summary:** 10/14 routes implemented; 2 partial (missing interactive filtering); 3 missing (`/analytics/`, `/colophon/`, `/gallery/[collection]/[image]/`).

---

## 2. Architecture

### SSR / Hybrid Mode

| Item | Spec | Status |
|------|------|--------|
| Hybrid output (SSG default, SSR opt-in) | `output: 'hybrid'` specified | ❌ Missing — `astro.config.mjs` has no `output` property set. Astro 5 defaults to `static`. No routes export `prerender = false`. The site is fully static with no SSR capability |
| Cloudflare adapter | `@astrojs/cloudflare` | ✅ Implemented — adapter configured in `astro.config.mjs` |
| Cloudflare Functions (personalisation, analytics proxy) | SSR routes for dynamic features | ❌ Missing — no `functions/` directory, no SSR routes. Personalisation is client-side only |
| MDX integration | `@astrojs/mdx` | ✅ Implemented — in `astro.config.mjs` integrations |
| Sitemap | `@astrojs/sitemap` | ✅ Implemented |
| Preact islands | `@astrojs/preact` | ✅ Implemented — 6 island components in `src/components/islands/` |
| Tailwind CSS | Custom dark/light theme | ✅ Implemented |
| `astro-icon` | Listed in spec integrations | ❌ Missing — not in `package.json` or `astro.config.mjs` |

### Cloudflare Stack

| Item | Spec | Status |
|------|------|--------|
| Pages deployment | Build + deploy from `main` | ✅ Implemented — `.github/workflows/deploy.yml` exists, `wrangler.toml` configured |
| R2 media storage | Images, audio stored in R2 | ❌ Missing — R2 binding is commented out in `wrangler.toml`. Media served from `public/` directory |
| KV (visitor segments, build metadata) | Cache layer for personalisation | ❌ Missing — no KV binding in `wrangler.toml` |
| Cloudflare Web Analytics | Baseline analytics | ❌ Missing — only GA4 is implemented |

**Summary:** Core Astro setup is solid. Cloudflare-specific infrastructure (R2, KV, Functions, hybrid SSR) is entirely absent. The site operates as a fully static deployment.

---

## 3. Content Pipeline

### Scripts Inventory

| Script | Spec | Status |
|--------|------|--------|
| `scripts/new-post.sh` | Scaffold blog post | ✅ Implemented |
| `scripts/new-project.sh` | Scaffold project page | ✅ Implemented |
| `scripts/import-gallery.sh` | Process image directory | ✅ Implemented |
| `scripts/import-audio.sh` | Process audio file | ✅ Implemented |
| `scripts/sync-repos.sh` | Pull project metadata from GitHub API | ❌ Missing |
| `scripts/optimise-images.sh` | Batch image optimisation (Sharp, WebP/AVIF, srcsets) | ⚠️ Partial — script exists but no Sharp dependency in `package.json`; no evidence of WebP/AVIF output pipeline |
| `scripts/generate-audio.sh` | Generate audio via NotebookLM API | ❌ Missing |
| `scripts/research-topic.sh` | Research/generate source material | ❌ Missing |

**Additional scripts found (not in spec):**
- `scripts/upload-media.sh` — media upload utility
- `scripts/content-pipeline.sh` — content pipeline orchestrator
- `scripts/import-notebook.sh` — NotebookLM asset importer
- `scripts/export_astro.py` — Python export utility
- `scripts/topics/` — topic research directory

### Build Pipeline

| Feature | Spec | Status |
|---------|------|--------|
| Frontmatter validation | Content collections validate | ✅ Implemented — `src/content.config.ts` with Zod schemas and `.min(1)` on tags |
| Cross-links from shared tags | Auto-generated | ✅ Implemented — `RelatedContent.astro` scores by tag overlap across all content types |
| Image pipeline (Sharp, WebP/AVIF, srcsets) | Optimised responsive images | ❌ Missing — no Sharp dependency, no image processing in build pipeline. Gallery images served as raw `<img>` tags |
| Audio metadata extraction | Extracted during build | ❌ Missing — audio metadata is manual in frontmatter |
| Project index from GitHub API | Refreshed from API, cached | ❌ Missing — `sync-repos.sh` does not exist |
| Sitemap generation | Auto-generated | ✅ Implemented — via `@astrojs/sitemap` |
| RSS generation | Blog + podcast feeds | ✅ Implemented — `blog/rss.xml.ts` and `audio/feed.xml.ts` |

**Summary:** Core scaffolding scripts present. Auto-discovery pipeline (GitHub sync, image optimisation, audio generation) is largely missing. Cross-linking is well implemented.

---

## 4. Design System

### Typography

| Item | Spec | Status |
|------|------|--------|
| Headings: variable-weight sans-serif | Inter or similar | ⚠️ Partial — system-ui font stack used (no Inter). `font-semibold` on headings in `global.css`. Acceptable given README states "System fonts only" |
| Body text | Readable for long-form | ✅ Implemented — `line-height: 1.75rem` on base text, `max-w-prose` (65ch) used throughout |
| Code: monospace | JetBrains Mono or similar | ⚠️ Partial — system monospace stack (`ui-monospace, SFMono-Regular, Menlo`). No JetBrains Mono loaded. Consistent with zero-font-download policy |
| Modular scale, responsive | Font size scale | ✅ Implemented — 9-step scale in `tailwind.config.mjs`, responsive heading sizes in `global.css` |

### Colour & Theming

| Item | Spec/Charter | Status |
|------|------|--------|
| Dark mode default | Rich dark backgrounds, warm accent | ✅ Implemented — `:root` dark palette in `global.css`, amber accent `#e8a84c` |
| Light mode parity | Full support, comfortable contrast | ✅ Implemented — `.light` class with complete token overrides |
| CSS custom properties | Token-driven theming | ✅ Implemented — 11 tokens defined, Tailwind maps them in `tailwind.config.mjs` |
| No `dark:` prefix | Charter/CLAUDE.md constraint | ✅ Implemented — no `dark:` classes found in codebase |
| WCAG AA contrast | Enforced | ⚠️ Partial — comment in `global.css` states "All text/background combos verified >= 4.5:1". Light mode accent darkened to `#b07820`. No automated contrast testing in CI |
| Theme flash prevention | Inline script before paint | ✅ Implemented — inline `<script is:inline>` in `BaseLayout.astro` reads `localStorage('theme')` |

### Shadows & Layout

| Item | Status |
|------|--------|
| Shadow tokens | ✅ Implemented — `subtle`, `card`, `raised` using `--color-shadow` variable |
| Content width | ✅ Implemented — `max-w-prose: 65ch` for prose, `max-w-6xl` for layout containers |
| CSS Grid for galleries/cards | ✅ Implemented — `grid gap-6 sm:grid-cols-2` and `lg:grid-cols-3` used |
| Mobile-first responsive | ✅ Implemented — base styles mobile, `sm:` and `md:` breakpoints used throughout |

### Accessibility

| Item | Charter | Status |
|------|---------|--------|
| WCAG 2.1 AA minimum | Non-negotiable | ⚠️ Partial — colour contrast addressed; skip-to-content link present; `aria-label`, `aria-expanded`, `aria-current` used on nav; no automated testing |
| Keyboard navigation | Works everywhere | ✅ Implemented — focus-visible styles in `global.css`, Escape key closes mobile menu, skip link |
| `prefers-reduced-motion` | Disables all animation | ✅ Implemented — `global.css` `@media (prefers-reduced-motion: reduce)` sets all animations/transitions to 0.01ms |
| Screen reader testing | Requirement | ❌ Missing — no evidence of screen reader testing process or CI integration |
| Skip to content | Accessible foundation | ✅ Implemented — `<a href="#main-content" class="sr-only focus:not-sr-only...">` in `BaseLayout.astro` |

**Summary:** Design system is well-structured with consistent token usage. Typography uses system fonts (intentional divergence from spec). Accessibility foundations are solid but lack automated verification.

---

## 5. Analytics & Intelligence

### GA4 Integration

| Item | Spec | Status |
|------|------|--------|
| Consent-gated loading | No tracking before opt-in | ✅ Implemented — `Analytics.astro` checks `getConsent()?.analytics` before loading GA4 |
| Async, non-blocking | Must not block render | ✅ Implemented — script tag uses `async = true`, loaded dynamically after consent |
| Custom events: project_click | Project views | ✅ Implemented — `trackProjectClicks()` |
| Custom events: gallery_view | Gallery interactions | ✅ Implemented — `trackGalleryViews()` |
| Custom events: audio_play | Audio plays | ✅ Implemented — `trackAudioPlayback()` with progress milestones |
| Custom events: scroll_depth | Scroll depth | ✅ Implemented — 25/50/75/100% milestones |
| Custom events: reading_time | Engagement | ✅ Implemented — fires on page hide for blog/project/about pages |
| Custom events: outbound_click | External links | ✅ Implemented |
| Custom events: copy_text | Content engagement | ✅ Implemented |
| Custom events: theme_switch | Navigation | ✅ Implemented |
| Custom events: tag_filter | Navigation | ✅ Implemented |
| Custom events: page_timing | Performance | ✅ Implemented — DNS, TTFB, DOM complete, transfer size |
| Custom dimensions | content_type, tags, theme, referrer_type | ✅ Implemented — enriched page_view with all four plus device/connection info |
| Measurement Protocol (server-side) | Server-side events | ❌ Missing — no server-side analytics code (requires SSR/Functions) |
| GA4 Data API for dashboard | Powers `/analytics/` | ❌ Missing — no API integration, no dashboard |
| 50KB analytics budget | Charter constraint | ⚠️ Partial — GA4 gtag.js is ~90KB uncompressed (~30KB gzipped), likely within budget but no enforcement mechanism |

### Public Dashboard

| Item | Status |
|------|--------|
| `/analytics/` route | ❌ Missing |
| Preact island with GA4 data | ❌ Missing |
| Cloudflare Function data proxy | ❌ Missing |
| Aggregate-only (no individual data) | N/A — dashboard does not exist |

### Personalisation

| Feature | Spec | Status |
|---------|------|--------|
| Time-of-day greeting | SSR | ⚠️ Partial — implemented in `Personalisation.tsx` as client-side island, not SSR |
| "You might also like" | Client-side localStorage | ⚠️ Partial — `RelatedContent.astro` exists (tag-based, build-time) but no browsing-history-based recommendations. `Personalisation.tsx` has `recommendations` state but never populates it |
| Referral-aware hero | SSR | ⚠️ Partial — `Personalisation.tsx` shows referral hostname in greeting, but client-side only |
| Generative accent imagery | Build-time variants + client selection | ❌ Missing |
| Return visitor recognition | Cookie (consented), SSR | ⚠️ Partial — `Personalisation.tsx` tracks visit count client-side, shows "Welcome back" greeting. No SSR |

**Summary:** GA4 custom event tracking is comprehensive and well-implemented. The intelligence layer (dashboard, server-side events, SSR personalisation, generative imagery) is entirely absent. Personalisation exists as a client-side approximation of the SSR-based spec.

---

## 6. Privacy

| Requirement | Charter Section | Status |
|-------------|----------------|--------|
| Consent before collection | 4.5 | ✅ Implemented — `ConsentBanner.astro` shows before any tracking loads |
| No tracking before opt-in | 4.5 | ✅ Implemented — GA4 loads only after `consent.analytics === true` |
| Do Not Track respected | Implied | ✅ Implemented — `isDNT()` check auto-declines if navigator.doNotTrack === '1' |
| Granular consent (analytics/personalisation) | 4.5 | ✅ Implemented — "Manage" expands checkboxes for each category |
| No cross-site tracking | 4.5 | ✅ Implemented — no third-party scripts beyond GA4 (which is consent-gated) |
| No fingerprinting | 4.5 | ✅ Implemented — no fingerprinting code present |
| Anonymous personalisation | 4.5 | ✅ Implemented — coarse segments (visit count, referrer hostname, time-of-day) |
| Data minimisation | 4.5 | ✅ Implemented — visitor memory limited to 50 viewed paths, visit count, referrer |
| Client-side data expires | 4.5 | ⚠️ Partial — consent cookie has 1-year `max-age`, but localStorage data has no TTL/expiry mechanism |
| User can see what site knows | 4.5, 5.3 | ✅ Implemented — `Transparency.tsx` island on `/about/` page shows consent state, visit history |
| User can reset profile | 4.5, 5.3 | ✅ Implemented — "Reset all preferences and reload" and "Clear browsing memory" buttons |
| User can opt out without losing content | 4.5 | ✅ Implemented — declining consent does not degrade content access |
| Geographic/GDPR adaptation | 4.5 | ❌ Missing — no geo-detection or jurisdiction-adaptive consent |
| Cookie consent dispatch event | — | ✅ Implemented — `consent-updated` CustomEvent dispatched on save |
| Privacy policy accessible | — | ✅ Implemented — banner links to `/about/#privacy` |

**Summary:** Privacy implementation is strong and thoughtful. The main gaps are localStorage expiry (no TTL) and GDPR geographic adaptation.

---

## 7. SEO

| Item | Spec | Status |
|------|------|--------|
| Open Graph tags (all pages) | All pages | ✅ Implemented — `SEOHead.astro` included in `BaseLayout.astro`, renders og:type, og:url, og:title, og:description, og:image, og:site_name |
| Twitter/X cards | All pages | ✅ Implemented — twitter:card, twitter:title, twitter:description, twitter:image |
| JSON-LD (Person) | Structured data | ⚠️ Partial — `Person` type used as `author` nested inside Article/WebSite. No standalone Person schema on `/about/` |
| JSON-LD (Article) | Structured data | ✅ Implemented — `type: 'article'` on blog and project detail pages |
| JSON-LD (CreativeWork) | Structured data | ❌ Missing — not used anywhere; projects use Article type |
| RSS feed (blog) | Feed generation | ✅ Implemented — `/blog/rss.xml` with title, description, categories |
| Podcast RSS feed (audio) | Feed generation | ✅ Implemented — `/audio/feed.xml` with iTunes extensions |
| `sitemap.xml` | Auto-generated | ✅ Implemented — via `@astrojs/sitemap` integration |
| Canonical URLs | All pages | ✅ Implemented — `<link rel="canonical">` in `SEOHead.astro` |
| OG default image | Fallback image | ❌ Missing — `SEOHead.astro` references `/og-default.png` but file does not exist in `public/` |
| `article:published_time` | Article metadata | ✅ Implemented — conditionally rendered when `publishedDate` is provided |
| `article:tag` | Article metadata | ✅ Implemented — mapped from tags array |

**Summary:** SEO foundations are solid. Gaps are JSON-LD `CreativeWork` type for projects, standalone `Person` schema, and the missing OG default image file.

---

## 8. Content Inventory

### Projects

| Project (Spec Featured) | Status |
|--------------------------|--------|
| This Wasn't in the Brochure | ✅ `src/content/projects/this-wasnt-in-the-brochure.md` |
| Failure First | ✅ `src/content/projects/failure-first.md` |
| Footnotes at the Edge of Reality | ✅ `src/content/projects/footnotes-at-the-edge-of-reality.md` |
| Why Demonstrated Risk Is Ignored | ✅ `src/content/projects/why-demonstrated-risk-is-ignored.md` |
| CV | ✅ `src/content/projects/cv.md` |

**Total project pages:** 18 (including 5 spec featured + 13 additional)
Additional projects: orbitr, tel3sis, rlm-mcp, dx0, cygnet, home-assistant-obsidian, latent-self, squishmallowdex, space-weather, agentic-index, ordr-fm, adhdo, afterglow-engine, dodgylegally, tanda-pizza, before-the-words-existed

**Auto-discovery from 115 repos:** ❌ Missing — `sync-repos.sh` does not exist. Projects are manually curated.

### Blog

| Item | Count |
|------|-------|
| Published posts | 3 (hello-world, exegesis-footnotes, footnotes-at-the-edge-of-reality) |
| Draft posts | 0 visible |

### Gallery

| Item | Count |
|------|-------|
| Collections | 1 (sample-collection) |

### Audio

| Item | Count |
|------|-------|
| Episodes | 1 (welcome) |

### Content Collection Schemas

| Collection | Spec Fields | Status |
|------------|-------------|--------|
| blog | title, description, date, tags, draft, heroImage, updatedDate | ✅ Implemented — plus NotebookLM asset fields |
| projects | title, description, date, tags, status, featured, url, repo, heroImage | ✅ Implemented — plus NotebookLM asset fields |
| gallery | title, date, tags, images, medium, collection, coverImage | ✅ Implemented |
| audio | title, description, date, tags, audioUrl, duration, transcript, heroImage | ✅ Implemented |

**Summary:** All five spec-featured projects exist. Content volume is thin (3 blog posts, 1 gallery collection, 1 audio episode, 18 projects). Auto-discovery pipeline for the 115 GitHub repos is not implemented.

---

## 9. Performance

| Requirement | Charter | Status |
|-------------|---------|--------|
| Lighthouse >= 90 mobile | 4.6 | ⚠️ Unknown — no Lighthouse CI configured; likely achievable given static output, minimal JS |
| LCP < 2.5s | 4.6 | ⚠️ Unknown — no measurement; static pages with no blocking resources should meet this |
| INP < 200ms | 4.6 | ⚠️ Unknown — minimal interactivity suggests compliance |
| CLS < 0.1 | 4.6 | ⚠️ Unknown — no web fonts (good); lazy images could shift without explicit dimensions |
| JS budget < 100KB first-load | 4.6 | ⚠️ Partial — Preact (~4KB) + island code is small; no third-party JS on first load (GA4 is consent-gated). Likely compliant but not measured |
| No blocking third-party scripts | 4.6 | ✅ Implemented — GA4 loads async after consent; no other third-party scripts |
| Images: WebP + AVIF, srcsets, lazy | 4.6 | ❌ Missing — no image optimisation pipeline; gallery uses raw `<img>` tags; `loading="lazy"` is used on gallery covers but no WebP/AVIF conversion or srcset generation |
| Audio: MP3, no auto-play | 4.6 | ✅ Implemented — `AudioPlayer.tsx` exists; podcast feed uses MP3; no auto-play |
| Zero custom fonts | README | ✅ Implemented — system font stack only |

**Summary:** Performance foundations are strong (static output, minimal JS, no blocking scripts, no custom fonts). Formal measurement is absent. Image pipeline is the largest gap.

---

## Overall Summary

### By Category

| Category | ✅ | ⚠️ | ❌ |
|----------|-----|-----|-----|
| Routing | 8 | 2 | 3 |
| Architecture | 5 | 0 | 6 |
| Content Pipeline | 5 | 1 | 5 |
| Design System | 12 | 4 | 1 |
| Analytics & Intelligence | 13 | 5 | 4 |
| Privacy | 12 | 1 | 1 |
| SEO | 9 | 1 | 2 |
| Content Inventory | 5 | 0 | 1 |
| Performance | 3 | 5 | 1 |

### Top Priority Gaps

1. **No SSR/hybrid mode** — the entire personalisation and intelligence architecture assumes server-side rendering via Cloudflare Functions. Currently everything is static with client-side workarounds.
2. **No R2 or KV** — media storage and caching infrastructure specified but not configured.
3. **No image pipeline** — WebP/AVIF conversion, responsive srcsets, and Sharp integration are absent.
4. **Missing routes** — `/analytics/` (public dashboard), `/colophon/`, and individual gallery image pages do not exist.
5. **No auto-discovery** — `sync-repos.sh` and GitHub API integration for the 115-repo inventory is not implemented.
6. **No performance measurement** — Lighthouse CI, Core Web Vitals monitoring, and JS budget enforcement are not in place.
7. **No GDPR geographic adaptation** — consent mechanism does not vary by jurisdiction.
8. **Missing OG default image** — `SEOHead.astro` references `/og-default.png` which does not exist.

### What Works Well

- Privacy and consent implementation is thorough and thoughtful
- GA4 custom event tracking is comprehensive (12+ event types with enriched dimensions)
- Design system tokens are consistent and well-structured across CSS and Tailwind
- Cross-content linking via `RelatedContent.astro` spans all four content types
- Accessibility foundations (skip-to-content, focus-visible, reduced-motion, ARIA attributes) are solid
- Content collection schemas match spec with useful extensions (NotebookLM assets)
- Both blog RSS and podcast RSS feeds are implemented
- SEO meta tags (OG, Twitter, JSON-LD, canonical) are present on all pages
