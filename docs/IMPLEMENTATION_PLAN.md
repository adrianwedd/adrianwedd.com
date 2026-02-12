# IMPLEMENTATION PLAN: adrianwedd.com

**Governed by:** `docs/DESIGN_CHARTER.md` v2.0
**Spec:** `docs/PROJECT_SPEC.md`
**Deferred features:** `docs/ROADMAP.md`

---

## Phases

Work is divided into 4 phases. Each phase produces a deployable site. Later phases add features to a working foundation. Features trimmed from this plan live in `ROADMAP.md` — nothing is forgotten, just sequenced.

---

## Phase 1: Foundation

**Goal:** Deployable Astro site on Cloudflare Pages with dark/light theme, responsive layout, home page, and R2 media bucket ready.

### Tasks

1. **Initialise Astro project**
   - `npm create astro@latest` with TypeScript, strict mode
   - Configure `hybrid` output with `@astrojs/cloudflare` adapter
   - Add integrations: `@astrojs/mdx`, `@astrojs/sitemap`, `@astrojs/preact`, `@astrojs/tailwind`
   - Configure content collections schema (blog, projects, gallery, audio)

2. **Tailwind + design tokens**
   - Dark/light theme with CSS custom properties
   - Typography scale (headings, body, code)
   - Colour palette (dark default, full light mode parity)
   - Spacing, border-radius, shadow tokens
   - WCAG AA contrast verification (both modes)

3. **Base layout + components**
   - `BaseLayout.astro` — HTML head, meta, theme toggle, skip nav, `prefers-reduced-motion`
   - `Header.astro` — navigation, theme toggle
   - `Footer.astro` — links, colophon link
   - `SEOHead.astro` — Open Graph, Twitter cards, JSON-LD
   - Responsive nav (mobile hamburger or similar)
   - Keyboard navigation verified on all components

4. **Home page**
   - Hero section: name, tagline, warm introduction
   - Featured projects grid (placeholder data)
   - Recent blog posts (placeholder)
   - Subtle personality — not a template

5. **Cloudflare R2 setup**
   - Create R2 bucket for media assets
   - Configure public access
   - Set up local sync script (`scripts/upload-media.sh`)

6. **Deploy to Cloudflare Pages**
   - Connect GitHub repo
   - Configure build command and output directory
   - Verify DNS (adrianwedd.com)
   - Confirm preview deploys work on PR branches

7. **Lighthouse baseline**
   - Run Lighthouse, verify ≥ 90 performance on mobile
   - WCAG AA compliance check on base layout
   - Fix any issues before proceeding

### Acceptance Criteria
- Live site at adrianwedd.com
- Dark/light theme, responsive, accessible (WCAG AA)
- Lighthouse ≥ 90 mobile
- R2 bucket provisioned and accessible
- Keyboard navigation works everywhere

---

## Phase 2: Content

**Goal:** Blog, project pages, gallery, audio, and About/CV populated with real content.

### Tasks

1. **Blog infrastructure**
   - Content collection: `src/content/blog/`
   - Frontmatter schema: title, date, tags, description, draft
   - Blog index page with tag filtering
   - Individual post layout with reading time, prev/next
   - RSS feed generation
   - `scripts/new-post.sh` scaffold script

2. **Project pages**
   - Content collection: `src/content/projects/`
   - Frontmatter schema: title, description, tags, url, repo, status, featured
   - Project index page (filterable grid)
   - Individual project layout (hero, description, links, related posts)
   - `scripts/new-project.sh` scaffold script
   - Create showcase pages for key projects:
     - thiswasntinthebrochure.wtf
     - failurefirst.org
     - Footnotes at the Edge of Reality
     - Why Demonstrated Risk Is Ignored
     - CV (living professional document)

3. **Gallery**
   - Content collection: `src/content/gallery/`
   - Frontmatter: title, date, tags, images array, description, medium, collection
   - Gallery index (masonry/grid layout, filterable by collection, tag, medium)
   - Collection pages: curated sets with narrative text, ordering, cover image
   - Lightbox navigation within collections
   - `scripts/import-gallery.sh` — process image directory → collection frontmatter, optimise via Sharp (WebP/AVIF), upload to R2
   - `scripts/optimise-images.sh` — batch optimisation
   - Lazy loading, blur placeholders

4. **Audio**
   - Content collection: `src/content/audio/`
   - Frontmatter: title, date, tags, audioUrl, duration, description, transcript
   - Audio player component (Preact island)
   - Episode page with player, show notes, transcript
   - Podcast RSS feed (Apple Podcasts compatible)
   - `scripts/import-audio.sh` — process audio file → episode

5. **About/CV page**
   - Import and adapt content from `../cv/`
   - Living document format — not a static résumé
   - Links to projects, writing, other presences

6. **Cross-linking system**
   - Shared tag taxonomy across content types
   - "Related content" component (auto-generated from tags)
   - Project ↔ Blog ↔ Gallery ↔ Audio connections

7. **Content migration**
   - Identify existing blog posts/essays from old sites
   - Convert and import with proper frontmatter
   - Preserve or redirect old URLs if applicable

### Acceptance Criteria
- Blog with posts, RSS feed
- Project showcase with 5+ featured projects
- Gallery with art collections, lightbox
- Audio section with player and podcast feed
- About page
- Cross-linked taxonomy
- Lighthouse ≥ 90 maintained

---

## Phase 3: Intelligence

**Goal:** Analytics integration, consent system, and client-side personalisation.

### Tasks

1. **Consent system**
   - Cookie consent banner (GDPR-compliant)
   - Granular consent: analytics, personalisation
   - Consent state stored in cookie + localStorage
   - No tracking before consent
   - Respect Do Not Track header

2. **GA4 integration**
   - Consent-gated script loading (async, non-blocking)
   - Custom events: page views, project clicks, audio plays, scroll depth, gallery interactions
   - Configure GA4 property and data streams

3. **Client-side personalisation**
   - localStorage-based visitor memory (consented only)
   - "You might also like" recommendations from browsing history
   - Time-of-day greeting variation
   - Referral-source awareness (via `document.referrer`)
   - Graceful fallback: full experience without consent or with cookies blocked

4. **Transparency**
   - "What this site knows about you" component
   - Shows consent state, stored preferences, browsing context
   - Reset/opt-out controls — clear everything with one click

### Acceptance Criteria
- No tracking before consent
- GA4 fires custom events correctly (consent-gated)
- Personalisation works client-side, degrades to full static
- Visitor can see and reset all stored data
- Lighthouse ≥ 90 maintained (analytics non-blocking)

---

## Phase 4: Polish & Launch

**Goal:** Performance hardening, SEO, accessibility audit, documentation, and launch.

### Tasks

1. **Performance hardening**
   - Lighthouse audit: all pages ≥ 90 mobile
   - Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1
   - Bundle analysis and tree shaking
   - Image audit (no oversized assets from R2)
   - Font loading optimisation (font-display: swap, subset)

2. **Accessibility audit**
   - WCAG 2.1 AA compliance check (full site)
   - Screen reader testing (VoiceOver)
   - Keyboard navigation audit (all routes)
   - Colour contrast verification (both themes)
   - `prefers-reduced-motion` testing

3. **SEO finalisation**
   - JSON-LD structured data on all page types
   - robots.txt, sitemap.xml verification
   - Social card images (auto-generated or designed)
   - Canonical URLs audit
   - Redirect map for legacy URLs

4. **Documentation**
   - CLAUDE.md for the repo (AI agent instructions)
   - README.md (project overview, local dev setup)
   - Content authoring guide (how to publish)

5. **Launch**
   - Final review
   - DNS cutover (if not already live)
   - Social announcement content prepared
   - Monitor analytics and performance post-launch

### Acceptance Criteria
- WCAG 2.1 AA across all pages
- Lighthouse ≥ 90 on all pages (mobile)
- Core Web Vitals passing
- All content types populated
- Documentation complete
- Site live at adrianwedd.com

---

## Phase Dependencies

```
Phase 1 (Foundation) ──→ Phase 2 (Content) ──→ Phase 3 (Intelligence)
                                                       │
                                                       ▼
                                                Phase 4 (Polish & Launch)
```

Phase 2 is the bulk of the work. Phase 3 can begin before Phase 2 is fully complete (consent + GA4 don't require all content). Phase 4 is a gate — nothing launches without passing its acceptance criteria.

---

## What We Build First

Phase 1. Get a live site with the right bones. Everything else layers on top of a working foundation.

---
