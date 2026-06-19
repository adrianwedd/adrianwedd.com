# E4 — Index Pagination + Carousel Crop Fix

**Status:** Design / awaiting implementation
**Issue:** #472 (UX & Accessibility hardening), item **E4** — "No pagination on any index; blog dumps every post."
**Date:** 2026-06-19

## Problem

The blog index renders all 79 published posts in one list; the audio index renders all 103 episodes. Both are unbounded "dumps" — long scroll, large DOM, no pageable URLs for SEO. Separately, the blog index's featured **ContentCarousel** displays portrait infographics (1536×2752) inside a **landscape** frame with `object-cover`, cropping them to a thin horizontal band.

## Goals

1. Paginate the **blog** and **audio** indexes, **including their tag pages** (large tags exist: audio `notebooklm`=79, `ai`=38; blog `research`=32, `ai-safety`=26 — so tag pages dump too).
2. Preserve every existing URL exactly (permalink strategy: published URLs never change).
3. Fix the carousel so infographics display **uncropped**.
4. No regression to filtering, RSS, search, or View-Transitions behaviour.

## Non-goals (YAGNI)

- Pagination for **projects** (36) and **gallery** (7) — explicitly out of scope.
- Per-card hero thumbnails on the post/episode list — list cards stay text-only (today's design).
- De-duping the `ai-safety` (26) vs `AID safety`/`AI safety` (26) tag-casing split — a real but separate content cleanup.
- Search-results pagination, infinite scroll / "load more".

## Decisions (locked with owner 2026-06-19)

| Decision | Value |
| --- | --- |
| Indexes paginated | blog + audio (main lists **and** tag pages) |
| Page size | **12** items/page |
| URL scheme | first page at the **existing base URL**; later pages get `/N/` |
| Audio tag filter | **replace** client-side filter with link-based tag chips → existing `/audio/tag/<tag>/` pages (mirror blog) |
| Carousel | render on **page 1 only**; fix crop via `object-contain` + dark backdrop |
| Page-2+ titles | append `" — Page N"` |

## Architecture

### Mechanism

Astro's built-in `paginate()` inside `getStaticPaths()`. Fully static; one HTML file per page is emitted at build.

**First-page-at-base via rest param.** Each route uses a `[...page].astro` rest parameter. Astro maps page 1 to the **undefined** param (→ base directory URL) and pages 2+ to `/2/`, `/3/`, … This is the documented pattern for keeping page 1 at the canonical base URL — critical for permalink preservation.

The `page` prop Astro injects exposes: `page.data` (this page's items), `page.currentPage`, `page.lastPage`, `page.url.prev`, `page.url.next`, `page.total`, `page.size`.

### Routes (4 new files; replace 2; convert audio filter)

| New file | Replaces | URLs generated |
| --- | --- | --- |
| `src/pages/blog/[...page].astro` | `blog/index.astro` | `/blog/` (p1), `/blog/2/`, … |
| `src/pages/blog/tag/[tag]/[...page].astro` | `blog/tag/[tag].astro` | `/blog/tag/<t>/` (p1), `/blog/tag/<t>/2/` |
| `src/pages/audio/[...page].astro` | `audio/index.astro` | `/audio/` (p1), `/audio/2/`, … |
| `src/pages/audio/tag/[tag]/[...page].astro` | `audio/tag/[tag].astro` | `/audio/tag/<t>/` (p1), `/audio/tag/<t>/2/` |

**Main index `getStaticPaths` shape:**

```js
export async function getStaticPaths({ paginate }) {
  const posts = (await getCollection('blog'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return paginate(posts, { pageSize: 12 });
}
const { page } = Astro.props;
```

**Tag index `getStaticPaths` shape** (paginate per tag, merging the `tag` param):

```js
export async function getStaticPaths({ paginate }) {
  const all = (await getCollection('blog')).filter((p) => !p.data.draft);
  const tags = [...new Set(all.flatMap((p) => p.data.tags))];
  return tags.flatMap((tag) => {
    const posts = all
      .filter((p) => p.data.tags.includes(tag))
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
    return paginate(posts, { params: { tag }, pageSize: 12 });
  });
}
const { page, tag } = Astro.props; // `tag` is passed via paginate props below
```

> Note: `paginate(items, { params: { tag }, props: { tag }, pageSize })` — pass `tag` in **both** `params` (for the URL) and `props` (so the page body can read it without re-deriving from `Astro.params`). Either is acceptable; the implementer picks one and is consistent.

### Pagination component

`src/components/Pagination.astro` — a presentational, zero-JS Astro component.

- **Props:** the Astro `page` object, or an explicit `{ currentPage, lastPage, prevUrl, nextUrl, hrefFor(n) }`. Implementer's choice; must support building hrefs where page 1 = base URL (no `/1/`).
- **Renders:** `← Prev` · numbered page links (with `…` ellipsis when `lastPage` is large — show first, last, and a window around current) · `Next →`.
- **Hidden entirely when `lastPage === 1`** (single-page tags/indexes render nothing).
- **Accessibility:** wrap in `<nav aria-label="Pagination">`; mark the current page with `aria-current="page"`; prev/next carry `rel="prev"` / `rel="next"`; disabled prev/next at the ends are rendered as non-link `<span>` (not focusable).
- **VT-safe:** plain `<a>` links only — no per-element JS, no cached DOM refs (follows the project's View-Transitions rules).
- **Styling:** accent-on-surface to match existing tag chips; current page uses `bg-accent/15 text-accent`.

**href rule (the one tricky bit):** page 1 → base URL (`/blog/`, `/blog/tag/x/`); page N>1 → base + `N/`. The component must never emit `/blog/1/`.

### Image presentation — carousel crop fix

Scope: `src/components/ContentCarousel.astro` (and `blog/[...page].astro` decides *when* to render it).

1. **Render the carousel on page 1 only.** `blog/[...page].astro` builds `carouselItems` from all hero posts but only renders `<ContentCarousel>` when `page.currentPage === 1`.
2. **Uncrop the image.** Replace `object-cover` with `object-contain` and place it on a dark surface backdrop (`bg-surface` / the existing card surface). Because infographics carry dark plum backgrounds (#1a181c) and the site surface is dark, the letterbox region blends in. `object-contain` never crops, so it is correct for **both** portrait infographics and the 25 landscape non-infographic heroes.
3. **Frame aspect.** Pick a frame that minimises letterbox gap for portrait art without making the slide excessively tall (candidate: a taller portrait-leaning aspect on the image cell, or `max-height` cap with `contain`). Exact value validated visually (build + screenshot) during implementation, not fixed here.
4. **Preserve** the existing `<Picture>` responsive widths, lazy/eager loading, and alt text. (Alt already uses the post title per B7's fix elsewhere; unchanged here.)

> The carousel JS (autoplay, dots, swipe, `astro:after-swap` re-init) is untouched.

### Audio filter conversion

`audio/[...page].astro` (replacing `audio/index.astro`):

- **Delete** the client-side tag-filter `<script>`, the `#tag-filters` button bar, the `data-tags/data-date/data-title` card attributes used only by that script, and the `#no-results` element.
- **Add** a link-based tag-chip nav identical in shape to the blog index's (`<a href="/audio/tag/<t>/">`), including the overflow "+N more" toggle pattern if desired (optional; can reuse blog's approach) and a "Browse all tags" link **only if** an `/audio/tags/` page exists (verify; blog links `/blog/tags/`). If no audio all-tags page exists, omit that link — do not invent a broken link.
- Episode list cards remain text-only and are now sliced to `page.data` (12/page).

## SEO

- **Self-canonical:** each paginated page's canonical URL is its own URL (so `/blog/2/` is canonical to itself, not to `/blog/`). Verify `SEOHead.astro` derives canonical from `Astro.url`; if it takes an explicit prop, pass the page URL.
- **`rel="prev"`/`rel="next"`** `<link>` tags in `<head>` for the paginated series (from `page.url.prev`/`page.url.next`). Harmless if a crawler ignores them.
- **Titles:** page 1 keeps today's title; pages 2+ append `" — Page N"` to avoid duplicate-title warnings. Tag page titles similarly: `"<Tag> — Page N"`.
- **No `noindex`** on paginated pages — they should be indexable.

## Permalink safety (must-hold invariant)

The `[...page]` rest param guarantees page 1 = the existing base URL, byte-for-byte. After this change these URLs must be **unchanged**: `/blog/`, `/audio/`, `/blog/tag/<t>/`, `/audio/tag/<t>/`. Only **new** `/N/` URLs are added. No redirects required. This is the single most important property to verify.

## Error / edge cases

- **Single-page collections/tags** (≤12 items): `paginate` yields one page; `Pagination` renders nothing; base URL behaves exactly as today.
- **Out-of-range page** (e.g. `/blog/99/`): not generated by `getStaticPaths`, so it 404s via the static host — acceptable and expected.
- **Draft filtering** stays identical (`!p.data.draft`) so counts and pages match the live set.
- **`feed.xml.ts`** (blog and audio RSS) reads the collection directly, **not** the paginated routes — unaffected. Confirm no feed imports `index.astro`.
- **Pagefind search** indexes all emitted HTML pages, including `/N/` — fine; no action.
- **`astro:after-swap`** — Pagination is link-only, no listeners to re-init; carousel re-init logic unchanged.

## Verification (no Astro test suite)

1. `npm run build` succeeds and `getStaticPaths` emits the expected files:
   - `dist/blog/index.html`, `dist/blog/2/index.html`, … up to `ceil(79/12)=7` pages.
   - `dist/audio/index.html`, `dist/audio/2/index.html`, … `ceil(103/12)=9` pages.
   - `dist/blog/tag/<tag>/index.html` (+ `/2/` for tags >12 items).
   - `dist/audio/tag/<tag>/index.html` (+ `/2/` for `notebooklm`, `ai`, …).
2. **Permalink check:** `dist/blog/index.html` and `dist/audio/index.html` still exist and render page 1 (the canonical URLs did not move).
3. `npm run check:links` (internal-link checker) passes — catches any pagination href that points at a non-emitted page (e.g. an accidental `/blog/1/`).
4. **Carousel:** build + screenshot `/blog/` and confirm a portrait infographic shows **whole/uncropped** in the featured carousel; confirm the carousel is **absent** on `/blog/2/`.
5. **Audio filter:** confirm `/audio/` tag chips are links to `/audio/tag/<t>/` and the removed filter JS leaves no console errors.
6. Optional: local Lighthouse (`npm run build && npm run lighthouse`) on `/blog/` to confirm no perf/a11y regression.

## Files touched (summary)

- **Add:** `blog/[...page].astro`, `blog/tag/[tag]/[...page].astro`, `audio/[...page].astro`, `audio/tag/[tag]/[...page].astro`, `src/components/Pagination.astro`.
- **Remove:** `blog/index.astro`, `blog/tag/[tag].astro`, `audio/index.astro`, `audio/tag/[tag].astro`.
- **Edit:** `src/components/ContentCarousel.astro` (object-contain + backdrop + frame aspect).
- **Verify-only:** `SEOHead.astro` (canonical), `audio/feed.xml.ts`, `blog/feed.xml.ts`, any `/blog/tags/` & `/audio/tags/` all-tags pages.
