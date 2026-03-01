# Sprint 25 Design: Polish, Performance & Reach

**Date:** 2026-03-01
**Issues:** #143, #141, #166

---

## Objective

Comprehensive polish sprint across UX, performance, content reach, and SEO. Eight tasks, zero new runtime dependencies. CSS-first animations, build-time image processing, schema enrichment.

---

## Scope

### 1. Scroll-driven entrance animations (#143)

`ScrollReveal.astro` component wrapping content sections. `IntersectionObserver` adds `.revealed` class on viewport entry. CSS animation: `opacity: 0 → 1` + `translateY(1rem → 0)`, 400ms ease-out. `prefers-reduced-motion: reduce` disables all animation.

Applied to: homepage cards, blog/project listing cards, content section headings. Not applied to above-the-fold content.

Single inline `<script>` — no island, no hydration.

### 2. LQIP blur-up placeholders (#141)

Build-time `getPlaceholder()` utility using `sharp` to generate 20px-wide base64 thumbnails. Inlined as CSS `background-image` on picture wrapper divs. Full image fades in over blurred placeholder on load.

Applied to: project hero images, gallery covers, blog hero images.

### 3. Verify failurefirst.org domain (#166)

Check DNS, HTTPS cert, site loads. Document status and close issue.

### 4. Project OG images

`scripts/generate-og-images.mjs` — build-time script using `sharp` to composite project title on branded 1200x630 template (dark surface + copper accent). Outputs to `public/og/`. Run on-demand or pre-build.

### 5. Lighthouse audit pass

Run Lighthouse on home, blog listing, blog post, projects, services. Fix anything below 95 across all four categories. Expected fixes: explicit image dimensions (CLS), color contrast on muted text, aria-labels on icon buttons.

### 6. Blog post series grouping

Optional `series` field in blog schema: `{ name: string, order: number }`. Detail pages render "Series" nav box with all posts in series + prev/next. Seed with Failure-First research cluster.

### 7. BreadcrumbList JSON-LD schema

Add `BreadcrumbList` to all content detail pages. Structure: Home → Section → Page. Derive from pathname segments. Add alongside existing schema blocks.

### 8. Preload critical assets

`<link rel="preload">` for critical CSS and above-fold hero images on landing pages (home, services). Measure with Lighthouse before/after.

---

## Approach

- **CSS-first animations** — zero JS runtime cost, `prefers-reduced-motion` respected
- **Build-time image processing** — sharp for LQIP and OG images, no client-side overhead
- **Schema enrichment** — BreadcrumbList and series navigation for SEO
- **Zero new runtime dependencies** — all new code is Astro components or build scripts

## Non-goals

- Spring physics / parallax (too heavy for the site's aesthetic)
- Client-side image processing
- #169 Testimonials (still blocked on quotes)
