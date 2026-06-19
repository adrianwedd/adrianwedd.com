# E4 — Index Pagination + Carousel Crop Fix

**Status:** Design / awaiting implementation (revised after 3-engine QA, 2026-06-19)
**Issue:** #472 (UX & Accessibility hardening), item **E4** — "No pagination on any index; blog dumps every post."
**Date:** 2026-06-19

## Problem

The blog index renders all 79 published posts in one list; the audio index renders all 103 episodes. Both are unbounded "dumps" — long scroll, large DOM, no pageable URLs for SEO. Separately, the blog index's featured **ContentCarousel** displays portrait infographics (1536×2752) inside a **landscape** frame with `object-cover`, cropping them to a thin horizontal band.

## Goals

1. Paginate the **blog** and **audio** indexes, **including their tag pages** (large tags exist: audio `notebooklm`=79, `ai`=38; blog `research`=32, `ai-safety`=26).
2. Preserve every existing URL exactly (permalink strategy: published URLs never change).
3. Fix the carousel so infographics display **uncropped**, in **both** colour themes.
4. No regression to filtering, sorting, RSS, search, or View-Transitions behaviour.

## Non-goals (YAGNI)

- Pagination for **projects** (36) and **gallery** (7) — explicitly out of scope.
- Per-card hero thumbnails on the post/episode list — list cards stay text-only.
- De-duping the `ai-safety` (26) vs `AI safety` (26) tag-casing split — separate content cleanup.
- Search-results pagination, infinite scroll / "load more", URL-param server-side sorting.

## Decisions (locked with owner 2026-06-19)

| Decision | Value |
| --- | --- |
| Indexes paginated | blog + audio (main lists **and** tag pages) |
| Page size | **12** items/page |
| URL scheme | first page at the **existing base URL**; later pages get `/N/` |
| Audio tag filter | **replace** client-side filter with link-based tag chips → existing `/audio/tag/<tag>/` pages |
| Carousel | render on **page 1 only**; fix crop via `object-contain` + **theme-independent** dark backdrop |
| Page-2+ titles | append `" — Page N"` (composed in the page, not SEOHead) |
| Audio sort control | **Remove it** (decided 2026-06-19) — server default newest-first stays |

## Architecture

### Mechanism — VALIDATED

Astro's built-in `paginate()` inside `getStaticPaths()`. Each collection root route is a **`[...page].astro` rest-parameter** route that **replaces** today's `index.astro`. Astro maps page 1 to the undefined param (→ base URL `/blog/`) and pages 2+ to `/2/`, `/3/`, …

**This was empirically verified on 2026-06-19** against the real repo (Astro 6.4.6):

- A `blog/[...page].astro` route **coexists cleanly with the existing `blog/[...slug].astro` detail route** — a full `astro build` completed with exit 0, **no collision/error**, and generated `/blog/` (page 1), `/blog/2/`…`/blog/7/`, **and** `/blog/the-machine/` (a detail page). The two rest routes do not conflict because their generated paths never overlap (no post slug is a bare integer) and Astro resolves priority for any theoretical overlap.
- The only conflict observed was when `index.astro` was left in place alongside `[...page].astro` (`WARN … /blog/[...page] conflicts with higher priority route /blog`). **Therefore `index.astro` MUST be deleted, not kept**, when its `[...page].astro` replacement lands.

> ⚠️ **Caveat (verified against Astro source, not public docs):** the `[...page]` rest-param dropping the page-1 number is implemented in `astro/dist/core/render/paginate.js` (`includesFirstPageNumber = false` when the param is a rest param) but is **not in the public Astro docs**. It is a tested-but-undocumented surface. Mitigation: the existing **internal-link checker** (`npm run check:links`) + the build's own route warnings will catch a regression (e.g. `/blog/` 404ing) if a future Astro major changes this. Add an explicit verification step (below) so a silent break is impossible.

### Routes (4 new files; delete 4)

| New file | Replaces (delete) | URLs generated |
| --- | --- | --- |
| `src/pages/blog/[...page].astro` | `blog/index.astro` | `/blog/` (p1), `/blog/2/`, … |
| `src/pages/blog/tag/[tag]/[...page].astro` | `blog/tag/[tag].astro` | `/blog/tag/<t>/` (p1), `/blog/tag/<t>/2/` |
| `src/pages/audio/[...page].astro` | `audio/index.astro` | `/audio/` (p1), `/audio/2/`, … |
| `src/pages/audio/tag/[tag]/[...page].astro` | `audio/tag/[tag].astro` | `/audio/tag/<t>/` (p1), `/audio/tag/<t>/2/` |

**Main index `getStaticPaths`:**

```js
export async function getStaticPaths({ paginate }) {
  const posts = (await getCollection('blog'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return paginate(posts, { pageSize: 12 });
}
const { page } = Astro.props;
```

**Tag index `getStaticPaths`** — `tag` MUST be passed in **both** `params` (URL) **and** `props` (render). (QA caught the original sample omitting `props`, which makes `Astro.props.tag` undefined.)

```js
export async function getStaticPaths({ paginate }) {
  const all = (await getCollection('blog')).filter((p) => !p.data.draft);
  const tags = [...new Set(all.flatMap((p) => p.data.tags))];
  return tags.flatMap((tag) => {
    const posts = all
      .filter((p) => p.data.tags.includes(tag))
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
    return paginate(posts, { params: { tag }, props: { tag }, pageSize: 12 });
  });
}
const { page, tag } = Astro.props;
```

### Page-2+ layout

Pages 2+ **drop** the full-viewport hero (`min-h-[100dvh]`) and the carousel (both are page-1-only), but **keep** the tag-chip nav (discoverability) plus the post/episode list and the Pagination control. The blog index's `/blog/tags/` "Browse all tags" link must be preserved on every page.

### Pagination component

`src/components/Pagination.astro` — presentational, zero-JS.

- **Props:** accept the explicit shape `{ currentPage, lastPage, prevUrl, nextUrl, basePath }`. Build intermediate numbered hrefs as `n === 1 ? basePath : `${basePath}${n}/``. **Do not** reference a `page.hrefFor(n)` helper — QA confirmed no such API exists on Astro's `Page` type (it exposes only `page.url.{current,prev,next,first,last}`).
- **Renders:** `← Prev` · numbered links (ellipsis window when `lastPage` large: first, last, ±1 around current) · `Next →`.
- **Hidden entirely when `lastPage === 1`.**
- **Accessibility:** `<nav aria-label="Pagination">`; `aria-current="page"` on current; disabled prev/next at the ends rendered as `<span aria-disabled="true">` (not focusable).
- **VT-safe:** plain `<a>` links only.
- **Styling:** matches existing tag chips (`bg-accent/15 text-accent` for current).

### Audio conversion — filter, **and the sort control**

`audio/[...page].astro` (replacing `audio/index.astro`):

- **Tag filter → links.** Delete the client-side tag-filter `<script>` + `#tag-filters` bar; add link-based tag chips → `/audio/tag/<t>/`. **No `/audio/tags/` "browse all" link** — that page does not exist (blog has one, audio does not); do not invent a broken link.
- **Sort control — REMOVE (decided 2026-06-19).** QA found the audio index also has a client-side **sort `<select>`** (`#sort-select`: Newest / Oldest / A–Z, `audio/index.astro:74-84`, `applySort()` ~`:173-187`) that the original spec ignored. Client-side sort cannot work across server-paginated pages, so **delete the dropdown and its `applySort()` script**. The server already renders newest-first by default (the common case); oldest / A–Z are a low-use, acknowledged feature loss.
- The `data-tags/data-date/data-title` card attributes exist **only** for the deleted filter+sort scripts; remove them with their consumers.
- Episode cards stay text-only, sliced to `page.data` (12/page).

## Image presentation — carousel crop fix (revised after QA)

Scope: `src/components/ContentCarousel.astro`; `blog/[...page].astro` renders it on page 1 only.

1. **Page-1-only render** (`page.currentPage === 1`).
2. **Uncrop:** replace `object-cover` with `object-contain`.
3. **Theme-independent backdrop (QA fix).** The image cell backdrop MUST be a **fixed dark colour** (e.g. the infographic plum `#1a181c`), **not** the theme token `bg-surface` — in light mode `bg-surface` is warm cream and would surround dark infographics with glaring cream letterboxes. A fixed dark backdrop blends with the infographics' own dark background in **both** themes; for the 25 landscape (photo) heroes a neutral dark letterbox is acceptable.
4. **Frame / hover (QA fix).** `object-contain` makes the existing `group-hover:scale-105` zoom look awkward (it magnifies the letterbox). Remove or reduce the hover scale for contained images. Exact frame proportion (keep ~4/3 landscape vs a taller cell vs per-item aspect via the existing build-time `src/lib/image-dimensions.ts`) is a **visual call validated by build + screenshot during implementation**, not fixed here — the hard constraints are: nothing cropped, fixed dark backdrop, works in both themes, landscape heroes not absurdly letterboxed.
5. **Preserve** the responsive `<Picture>` widths, lazy/eager loading, and alt text.

## SEO

- **Self-canonical:** verified — `SEOHead.astro:26-27` derives canonical from `Astro.url.pathname` (with `trailingSlash:'always'`), so `/blog/2/` self-canonicalises correctly. No change needed there for canonical.
- **Titles:** pages 2+ compose `"Blog — Page N"` / `"<Tag> — Page N"` **in the page** before passing `title` to BaseLayout/SEOHead (SEOHead has no suffix prop; it only appends `" — Adrian Wedd"`).
- **`noindex` preserved (QA fix):** the existing blog/audio tag pages set `noindex` (`blog/tag/[tag].astro:31`, `audio/tag/[tag].astro:26`). The new paginated tag routes **keep `noindex`** — do not change this SEO policy. Main blog/audio paginated pages remain indexable (as today).
- **`rel="prev"/"next"`: OPTIONAL / de-scoped.** QA (hermes) confirmed Google **retired** `rel=prev/next` as a signal in 2019; it's inert for Google, marginal for Bing. Given low benefit, **omit** it unless trivial. If added, it must be emitted via `BaseLayout`'s `slot="head"` from the page (SEOHead has no prev/next props) — so do **not** mark SEOHead "verify-only" if this is implemented.

## Sitemap (QA fix — `astro.config.mjs`)

`getSitemapMeta` (`astro.config.mjs:~41-50`) assigns priority by path regex. As written it would give numeric pagination pages **blog-post / episode priority**:

- `/^\/blog\/(?!tag\/)[^/]+\/$/` (→0.8) matches `/blog/2/`.
- `/^\/audio\/[^/]+\/$/` (→0.7) matches `/audio/2/`.

**Fix:** exclude bare-integer slugs so paginated pages get the default low priority (≈0.3–0.5), e.g. `/^\/blog\/(?!tag\/)(?!\d+\/)[^/]+\/$/` and the audio equivalent. Add `astro.config.mjs` to the edit list.

## Permalink safety (must-hold invariant)

`[...page]` keeps page 1 = the existing base URL, byte-for-byte (empirically confirmed: `/blog/` rendered page 1). After this change these URLs must be **unchanged**: `/blog/`, `/audio/`, `/blog/tag/<t>/`, `/audio/tag/<t>/`. Only **new** `/N/` URLs are added. No redirects required.

## Error / edge cases

- **Single-page collections/tags** (≤12 items): one page; `Pagination` renders nothing; base URL behaves as today.
- **Out-of-range page** (`/blog/99/`): not generated → 404 via static host. Expected.
- **Draft filtering** unchanged (`!p.data.draft`).
- **RSS unaffected (QA fix to filenames):** blog feed is `src/pages/blog/rss.xml.ts` (advertised `/blog/rss.xml` at `SEOHead.astro:60`); audio feed is `src/pages/audio/feed.xml.ts`. Both read the collection directly, **not** the index pages — confirmed decoupled. (Earlier draft mis-named the blog feed `feed.xml.ts`.)
- **Pagefind** indexes all `/N/` pages — fine; minor index growth from repeated excerpts; no action.
- **VT focus (a11y, nice-to-have):** after a pagination click, View Transitions reset focus to the top; the user must re-tab to the controls. Optional: restore focus to the Pagination container on `astro:after-swap`.

## Verification (no Astro test suite)

1. `npm run build` succeeds; **derive expected counts from collection size** (not hardcoded): `ceil(nBlog/12)` and `ceil(nAudio/12)` pages, plus tag pages (+`/2/` for tags >12).
2. Confirm emitted: `dist/blog/index.html`, `dist/blog/2/…/last`, `dist/audio/index.html`, `dist/audio/2/…`, tag page-1s and tag `/2/`s for big tags.
3. **Permalink check:** `dist/blog/index.html` & `dist/audio/index.html` still render page 1 (URLs did not move). Build must emit **no** `[...page]`-conflict warning (proves `index.astro` was deleted).
4. `npm run check:links` passes (catches any bad pagination href, e.g. an accidental `/blog/1/`, or a `/blog/` regression from the undocumented rest-param behaviour).
5. **Carousel:** screenshot `/blog/` → a portrait infographic shows **whole/uncropped** with a dark (not cream) backdrop in **both** themes; carousel **absent** on `/blog/2/`.
6. **Audio:** `/audio/` tag chips link to `/audio/tag/<t>/`; removed filter/sort scripts leave no console errors; sort control handled per the owner decision.
7. Optional: local Lighthouse on `/blog/`.

## Files touched (summary)

- **Add:** `blog/[...page].astro`, `blog/tag/[tag]/[...page].astro`, `audio/[...page].astro`, `audio/tag/[tag]/[...page].astro`, `src/components/Pagination.astro`.
- **Delete:** `blog/index.astro`, `blog/tag/[tag].astro`, `audio/index.astro`, `audio/tag/[tag].astro`.
- **Edit:** `src/components/ContentCarousel.astro` (contain + fixed dark backdrop + hover), `astro.config.mjs` (sitemap priority regex). `BaseLayout`/`SEOHead` only if `rel=prev/next` is implemented (optional).
- **Verify-only:** `blog/rss.xml.ts`, `audio/feed.xml.ts`, `blog/tags/index.astro`.

## QA provenance

Reviewed 2026-06-19 by three engines (codex, agy, hermes) in parallel. Headline: codex+agy both asserted a hard `[...page]`/`[...slug]` route collision — **disproven by an actual build** (clean exit, all routes generated). Hermes verified the rest-param mechanism against Astro source. All other findings (audio sort, light-theme letterbox, sitemap priority, RSS filename, tag-prop sample, noindex policy, rel=prev/next deprecation, phantom `hrefFor`) were valid and are folded in above.
