# Search, full-viewport background vis, and pagination UX — design

**Date:** 2026-06-25
**Status:** Approved-in-principle; spec written, QA pending, implementation plan next session
**Reference site:** `failurefirst.org` (local: `/Users/adrian/repos/failure-first/site`) — the background-canvas technique Adrian wants adrianwedd.com to match.

## Problem statement

Four UX issues Adrian raised in one pass:

1. **The background visualisations get masked by content and don't show at the bottom of pages.** Each page has a bespoke `HeroCanvas` animation (ink/radar/terrain/blueprint/dataflow/stream/…), but the canvas is locked to the hero `<section>` and faded to surface at the hero's bottom edge — so for the rest of the page the vis is gone. Adrian wants the vis to extend to the full viewport and be visible at the bottom of the page (near the footer), the way it works on `failurefirst.org`.
2. **Not enough space between the content and the footer.**
3. **Search is janky.** `https://adrianwedd.com/?s=make+search+work+like+this` does nothing — deep-link support only exists on `/search/` via `?q=` (not `?s=`), and only on that one page. The `/search/` box is buried under a `50dvh` hero, doesn't autofocus, and the Pagefind mount flashes a skeleton. The homepage `SearchAction` schema advertises `?q=`, so Google sitelinks search will never produce the `?s=` URL Adrian pasted.
4. **The numbered pagination on `/blog/` (and tag pages) is unwanted** — Adrian wants infinite scroll instead.

## Decisions (confirmed defaults)

- **Footer stays opaque.** The vis shows in the *gap above* the footer (transparent bottom scrim band + bottom padding on `<main>`), not through the footer itself. Matches "visible at the bottom of the pages" + "more space between the content and the footer."
- **Numbered pagination is replaced entirely on page 1** by infinite scroll. The static paginated routes (`/blog/2/`, `/blog/3/`, … and tag equivalents) are retained as the no-JS fallback and as the data source for the scroll-fetcher. Pages 2+ keep a fallback "Newer / Older" pair for direct visitors.

## Scope

Three files change for the architectural work; the rest are contained:

- `src/components/HeroCanvas.astro` — canvas positioning (absolute → fixed).
- `src/styles/global.css` — content scrim, bottom band, footer spacing.
- `src/layouts/BaseLayout.astro` — `?s=` redirect script; bottom padding on `<main>`.
- `src/pages/search.astro` — compact header, autofocus, accept `?s=`.
- `src/pages/index.astro` — `SearchAction` schema `?q=` → `?s=`.
- `src/pages/blog/[...page].astro` — replace `Pagination` on page 1 with infinite-scroll sentinel + fetcher.
- `src/pages/blog/tag/[tag]/[...page].astro` — same infinite-scroll treatment.

No content-collection schema changes. No new dependencies. No worker changes.

---

## Workstream 1 — Full-viewport background vis + footer spacing

### Current behaviour

`HeroCanvas.astro` renders:

```html
<div class="hero-canvas-wrap absolute inset-0 z-0" data-animation="…">
  <canvas id="hero-canvas" class="absolute inset-0 h-full w-full" aria-hidden="true"></canvas>
  <div class="hero-canvas-overlay pointer-events-none absolute inset-0 z-[1]"></div>
</div>
```

The wrap is `absolute inset-0` of the page's hero `<section>` (which is `min-h-[100dvh]` on home/blog/projects, `50dvh` on search/activity/analytics). The canvas only paints within that section. `.hero-canvas-overlay` is a vertical gradient fading `transparent → --color-surface`, so the vis fades out at the hero's bottom edge. Below the hero, the body's `--color-surface` background (set on `:root`/`body` in `global.css`) covers everything — no vis for the rest of the page.

### Reference (failure-first)

```css
#sensor-grid-bg {            /* <canvas> at body level, outside <main> */
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  z-index: -1; pointer-events: none;
}
main {
  position: relative; z-index: 1;
  /* transparent at top → opaque for content readability */
  background: linear-gradient(to bottom,
    rgba(5,8,16,0) 0px, rgba(5,8,16,0.55) 300px, rgba(5,8,16,0.88) 600px);
}
```

One fixed full-viewport canvas behind everything; `main` has a top-transparent gradient scrim so the vis bleeds through the hero and fades for content readability.

### Target design

Match the reference, adapted to adrianwedd.com's card-heavy layout and the requirement that the vis also show at the *bottom*.

**`HeroCanvas.astro` — change the wrap from `absolute` to `fixed`:**

```html
<div class="hero-canvas-wrap fixed inset-0 z-0" data-animation="…">
  <canvas id="hero-canvas" class="fixed inset-0 h-full w-full" aria-hidden="true"></canvas>
</div>
```

- The canvas now fills the viewport behind all content on every page. Per-page `animation` prop unchanged — pages keep calling `<HeroCanvas animation="terrain" />` exactly as today.
- **Remove `.hero-canvas-overlay`** (the hero-bottom fade). The content scrim (below) replaces it and applies globally. A light top-only fade may be kept purely for hero-text legibility, scoped to the hero section via the page, not the canvas component.
- **Canvas sizing:** `sizeCanvas()` currently reads `section.clientWidth/clientHeight`. With `position: fixed`, switch to `window.innerWidth/innerHeight` (× dpr, capped at 2) and re-size on `resize` (already handled). The animation registry is unchanged — each animation already draws relative to `w`/`h`.
- **Pause logic:** the IntersectionObserver that pauses the loop when the canvas is off-screen becomes a no-op (a fixed canvas is always in view). Keep the `document.visibilityState === 'hidden'` pause (tab backgrounded) and the `prefers-reduced-motion` gate (`display: none` on the wrap, already in `global.css`). This is the only real behavioural cost — see Tradeoffs.

**`global.css` — content scrim on `<main>`:**

```css
main {
  position: relative; z-index: 1;
  background:
    linear-gradient(to bottom,
      transparent 0px,
      color-mix(in srgb, var(--color-surface) 92%, transparent) 320px,
      var(--color-surface) clamp(420px, 45dvh, 720px),
      var(--color-surface) calc(100% - clamp(320px, 40dvh, 640px)),
      color-mix(in srgb, var(--color-surface) 92%, transparent) calc(100% - 160px),
      transparent 100%);
}
```

Concretely: `<main>` gets a vertical gradient with **pixel-based stops** so the transparent bands are a consistent size regardless of page length:

- Top band: transparent for the first ~`60dvh`-equivalent (hero — vis fully visible). Implemented as a fixed pixel value (e.g. `0px` → transparent, fade to opaque by ~`clamp(280px, 40dvh, 520px)`).
- Middle: opaque `--color-surface` (content readability; cards sit on this).
- Bottom band: transparent again for the last ~`40dvh` so the vis shows through near the footer, with enough bottom padding on `<main>` (see below) that the band has real height.

The gradient is built with `color-mix` / the surface CSS variable so it tracks light/dark theme automatically. Because `<main>`'s height = content height (the gradient's `100%` is the full content scroll height), pixel stops keep the bands stable on short and long pages alike.

**Footer spacing — `BaseLayout.astro`:**

- Add bottom padding to `<main>` (e.g. `pb-[20dvh]` or a `min-h` bottom spacer) so the transparent bottom scrim band has room and the vis is clearly visible in the gap before the footer. This is the "more space between content and footer" fix.
- `<Footer>` stays as-is (opaque `bg-surface-alt/50`). The vis shows in the gap above it, not through it.

### Pages unaffected / no edits

The 16 pages that call `<HeroCanvas>` do **not** change — the component's internal positioning change does the work. Hero `<section>`s keep their `min-h-[100dvh]` / `50dvh` and `relative z-10` text; the now-fixed canvas renders behind them as expected.

### Tradeoffs

- **Animation loop never pauses via IntersectionObserver** (fixed canvas always in view). Mitigated by the existing tab-visibility pause and reduced-motion gate. GPU cost is roughly unchanged — the hero canvas was already near-viewport-sized.
- **Card-heavy pages (projects, blog list) hide most of the vis** behind cards in the middle band. This is intended (readability) — the vis is the hero + bottom gap, not the whole page.
- **Light mode:** the scrim must use `--color-surface` (light cream) so cards and text keep WCAG AA. The existing light-mode accent `#8a5e42` is unchanged.

---

## Workstream 2 — Search UX (`?s=` + focus + de-jank)

### `?s=` redirect (BaseLayout)

One small `is:inline` script in `BaseLayout.astro`, run before paint, registered once via a `documentElement.dataset` sentinel (consistent with the VT pattern in `CLAUDE.md`):

```js
var p = new URLSearchParams(location.search);
var s = p.get('s');
if (s != null && location.pathname !== '/search/') {
  location.replace('/search/?s=' + encodeURIComponent(s));
}
```

- Runs on every page. Any `?s=term` (e.g. the homepage URL Adrian pasted) immediately redirects to `/search/?s=term`.
- Uses `location.replace` so the redirecting URL doesn't clutter history.
- Only fires when not already on `/search/` (avoids a loop).

### `/search/` — accept `?s=` and `?q=`, compact header, autofocus

`src/pages/search.astro`:

- **Accept both params:** change the deep-link read from `q` only to `q || s`:
  ```js
  var q = new URLSearchParams(window.location.search).get('s')
       || new URLSearchParams(window.location.search).get('q');
  if (q && typeof ui.triggerSearch === 'function') ui.triggerSearch(q);
  ```
  Keep `q` for back-compat (existing bookmarks, the old schema).
- **Compact header:** replace the `min-h-[50dvh]` hero with a compact header (keep the radar `HeroCanvas` but small, e.g. `min-h-[28dvh]` or a slim band) so the search box sits near the top of the page.
- **Autofocus:** after `mountUI()` and after `triggerSearch`, focus `.pagefind-ui__search-input`. Defer focus until the input exists (the UI mounts async).
- **Skeleton flash:** the current skeleton shows until `PagefindUI` is defined and `mountUI` runs. Keep it, but ensure it's removed the instant `mountUI` succeeds (already done via `sk.remove()`). No change needed beyond the focus/param work.
- **Focus across View Transitions:** the existing `astro:page-load` re-init stays; add focus restore so navigating away and back to `/search/` refocuses the input.

### Homepage SearchAction schema — `index.astro`

Change `urlTemplate` from `https://adrianwedd.com/search/?q={search_term_string}` to `https://adrianwedd.com/search/?s={search_term_string}` so Google sitelinks search produces the `?s=` URL that now works.

---

## Workstream 3 — Pagination → infinite scroll (blog + tag pages)

### Current behaviour

`src/pages/blog/[...page].astro` uses Astro `paginate(posts, { pageSize: 12 })`, generating `/blog/`, `/blog/2/`, … The numbered `Pagination.astro` component renders prev/next + a numbered window. Tag pages (`/blog/tag/[tag]/[...page].astro`) do the same.

### Target design

Keep the static paginated routes as the data source and no-JS fallback. On **page 1 only**, replace the `Pagination` component with a sentinel + inline IntersectionObserver fetcher (progressive enhancement — Astro's recommended infinite-scroll pattern).

```html
{/* page 1 only */}
<div id="infinite-sentinel" data-next-url="/blog/2/" aria-hidden="true"></div>
<noscript>
  <a href="/blog/2/" rel="next">Older posts →</a>
</noscript>
```

Inline script (VT-safe: `documentElement.dataset` sentinel, event delegation, lazy DOM lookups, `astro:after-swap` re-init per `CLAUDE.md`):

- Observe `#infinite-sentinel`. On intersect:
  1. Read `data-next-url` from the sentinel.
  2. `fetch(url)`, parse `text/html`, query for the page's post-list `<article>`s (same selector the blog list uses) and the *next* page's `data-next-url` (from the fetched page's sentinel, or the fetched page's next pagination link).
  3. Append the articles to the post-list container. `ScrollReveal` re-observe the new nodes (the global ScrollReveal init already handles this via `astro:after-swap`; for appended nodes, call the reveal manually or add the `scroll-reveal` class + observe).
  4. `history.pushState(null, '', url)` to the page just loaded (so a refresh lands on the right page, and the URL reflects scroll position).
  5. Update the sentinel's `data-next-url`; if no next, disconnect the observer and remove the sentinel.
- **Tag pages:** identical treatment, parameterised by the tag path. The sentinel carries the tag-specific next URL.

Pages 2+ keep a minimal "Newer / Older" pair (the existing `Pagination` component, or a stripped-down variant) so direct visitors and no-JS users can navigate.

### Edge cases

- **VT swap mid-fetch:** guard with the sentinel dataset; if the page changes, don't append stale HTML.
- **Filter/tag toggle on blog page 1:** the blog tag chips are links (`/blog/tag/{tag}/`), so filtering navigates to a new page — infinite scroll re-inits cleanly. No interaction between the two.
- **Pagefind:** Pagefind indexes the static pages, not the JS-appended content — search results still link to the canonical paginated URLs. Appended posts are duplicate DOM of already-indexed pages, which is fine (they're not separate URLs).

---

## Workstream 4 — Footer spacing

Folded into Workstream 1: the bottom padding on `<main>` + the transparent bottom scrim band produce the gap. No separate work.

---

## Testing / verification

No Astro test suite. Verification is manual + the existing CI gates:

- `npm run dev` — eyeball each affected page: hero vis visible, vis visible in the bottom gap before footer, cards readable in the middle, footer spacing increased.
- `npm run build` — build passes; Pagefind index still generated.
- `npm run lint` / `npm run format:check` — pass.
- `node scripts/validate-content.js` — unaffected, but run for safety.
- `npm run check:links` — internal-link check passes (infinite scroll doesn't add/remove URLs; paginated routes still exist).
- Lighthouse (`npm run build && npm run lighthouse`) — CLS/Layout-shift within budget; the fixed canvas + scrim shouldn't shift content. Confirm no perf regression from the always-on canvas (the reduced-motion + tab-hidden pauses mitigate).
- Browser manual: `/search/?s=make+search+work+like+this` runs the search and focuses the input; `/?s=…` redirects there; `/blog/` scrolls to load page 2, 3, …; URL updates; refresh lands on the right page; no-JS (`?s` test with JS disabled) shows the fallback Older link.

## Out of scope (next session)

- Implementation plan (breakdown into commits, ordering, verification steps) — written via the `writing-plans` skill in the next session.
- Any worker / CSP / deploy changes — none needed.
- Renaming `?q=` → `?s=` on the `/search/` deep-link across other references (only the homepage schema and the `/search/` script reference `q`; both handled).