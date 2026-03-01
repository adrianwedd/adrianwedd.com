# Sprint 23 Design: Image Pipeline, CI Quality Gates & UX

**Date:** 2026-03-01
**Issues:** #140, #141, #142, #145, #147, #148, #149, #164

---

## Objective

Ship the deferred tech sprint: image performance, CI safety nets, and two UX improvements (View Transitions, CV sync). No new pages. All changes are infrastructure, configuration, and targeted component edits.

---

## Scope

### 1. Image pipeline — Astro `<Image>` / `<Picture>` migration (#140, #145)

**Current state:** Raw `<img>` tags throughout `index.astro`, `gallery/index.astro`, gallery detail pages, and blog. No WebP output, no responsive srcset, layout shift risk.

**What ships:**
- Replace all local-asset `<img>` with Astro's `<Image>` (single format) or `<Picture>` (multi-format with AVIF + WebP fallback) from `astro:assets`
- Automatic WebP/AVIF output, `srcset` at multiple widths, preserved `width`/`height` for CLS prevention
- Affected locations: project hero cards (homepage), gallery cover images, gallery detail/lightbox, blog hero images

**Out of scope:** Remote/external image URLs (can't optimise at build time), Lightbox JS-rendered images (dynamically loaded, stay as `<img>`)

---

### 2. LQIP blur placeholders (#141)

Astro 5 supports `placeholder="blur"` on local `<Image>` components natively. Generates a tiny inline base64 thumbnail shown while the full image loads, fades out via CSS transition. Apply to the same locations as the `<Image>` migration above.

Only applicable to local images (in `src/` or `public/`). Not applicable to external URLs.

---

### 3. CI: raw `<img>` enforcement (#148)

GitHub Actions step added to the existing deploy workflow (`.github/workflows/deploy.yml`). Runs after build, greps `src/` for `<img src=` patterns pointing to local paths (excludes `http://`, `https://`, `data:`). Fails the build if any are found. Keeps the pipeline clean going forward.

---

### 4. CI: link checker (#147)

Add `lychee` to the GitHub Actions workflow as a post-build step. Checks all internal links in the built `dist/` output for 404s. External links are checked but emit warnings only — external site downtime should not block deploys.

Config file at `.lychee.toml`:
- Exclude known-flaky or login-walled domains (LinkedIn, GitHub rate limits, etc.)
- Timeout: 10s per request
- Retry: 2

---

### 5. 404 analytics (#149)

The custom 404 page (`src/pages/404.astro`) already exists with search and CTAs. Add one GA4 event `page_not_found` fired via the existing consent-gated analytics pattern, passing `document.location.pathname` as the event parameter. Enables tracking of which URLs generate 404s in GA4.

Implementation: inline `<script>` in `404.astro` that dispatches via `window.dataLayer` after consent (mirrors the existing `Analytics.astro` pattern).

---

### 6. View Transitions (#142)

Single addition to `BaseLayout.astro`:
```astro
import { ViewTransitions } from 'astro:transitions';
// in <head>:
<ViewTransitions />
```

Enables smooth fade transitions between all pages. Astro handles the View Transitions API fallback for unsupported browsers automatically.

**Known interaction:** `<AudioPlayer>` island (`client:load`) may unmount/remount on navigation. Smoke test after enabling. Fix with `transition:persist` on the island if needed.

---

### 7. CV sync — GHA step + data module (#164)

**Approach:** Build-time import via GitHub Actions.

At deploy time, a GHA step checks out `adrianwedd/cv` as a sibling and copies `data/base-cv.json` to `src/data/base-cv.json` (gitignored). A typed data module `src/data/cv.ts` reads and exports structured fields. `about.astro` consumes the exported data instead of hardcoded strings.

**Scope (narrow):**
- One GHA step (`actions/checkout` for the cv repo)
- `src/data/cv.ts` — typed export of skills, occupation, jobTitle
- `about.astro` — replace hardcoded `knowsAbout`, `jobTitle`, occupation `name` with imported values
- `src/data/base-cv.json` added to `.gitignore`

**Local dev fallback:** If `src/data/base-cv.json` doesn't exist locally, `cv.ts` exports safe defaults (same values currently hardcoded in `about.astro`). No broken local builds.

---

## Out of scope

| Issue | Reason |
|-------|--------|
| #143 Scroll-driven animations | Cross-browser risk, needs content decisions |
| #138 VideoObject schema | Video pipeline not stable |
| #136 humans.txt | Trivial, any housekeeping PR |
| #146 Content validation | Deferred — define validation rules first |
| #150 Dep audit | Low urgency |
| #151 Build size budget | Low urgency |
| #144 dns-prefetch → preconnect | Minimal gain, 1-liner for any PR |

---

## Implementation order

1. Image `<Image>`/`<Picture>` migration (foundation — everything else builds on this)
2. LQIP `placeholder="blur"` (add-on to migration)
3. CI raw `<img>` enforcement (lock it in)
4. CI lychee link checker (independent CI addition)
5. 404 GA4 event (isolated page edit)
6. View Transitions (BaseLayout edit, smoke test AudioPlayer)
7. CV sync GHA step + `src/data/cv.ts`
8. Wire CV data into `about.astro`
