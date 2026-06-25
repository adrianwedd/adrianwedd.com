# Search, full-viewport background vis, and pagination UX — design

**Date:** 2026-06-25
**Status:** Spec revised after Codex + Hermes QA (Agy stalled and produced no usable output). Implementation plan next session.
**Reference site:** `failurefirst.org` (local: `/Users/adrian/repos/failure-first/site`) — the background-canvas technique Adrian wants adrianwedd.com to match.

## Problem statement

Four UX issues Adrian raised in one pass:

1. **The background visualisations get masked by content and don't show at the bottom of pages.** Each page has a bespoke `HeroCanvas` animation (ink/radar/terrain/blueprint/dataflow/stream/…), but the canvas is locked to the hero `<section>` and faded to surface at the hero's bottom edge — so for the rest of the page the vis is gone. Adrian wants the vis to extend to the full viewport and be visible at the bottom of the page (near the footer), the way it works on `failurefirst.org`.
2. **Not enough space between the content and the footer.**
3. **Search is janky.** `https://adrianwedd.com/?s=make+search+work+like+this` does nothing — deep-link support only exists on `/search/` via `?q=` (not `?s=`), and only on that one page. The `/search/` box is buried under a `50dvh` hero, doesn't autofocus, and the Pagefind mount flashes a skeleton. The homepage `SearchAction` schema advertises `?q=`, so Google sitelinks search will never produce the `?s=` URL Adrian pasted.
4. **The numbered pagination on `/blog/` (and tag pages) is unwanted** — Adrian wants infinite scroll instead.

## Decisions (confirmed defaults)

- **Footer stays opaque.** The vis shows in the *gap above* the footer (transparent bottom scrim band + bottom padding on `<main>`), not through the footer itself.
- **Numbered pagination is replaced entirely on page 1** by infinite scroll, progressively enhanced from a visible "Older posts" link (the link is both the no-JS fallback and the JS-enabled fallback if IntersectionObserver/fetch fails). The static paginated routes (`/blog/2/`, … and tag equivalents) are retained as the data source. Pages 2+ get a stripped prev/next pair (no numbered window).

## Scope

- `src/components/HeroCanvas.astro` — becomes a single body-level fixed canvas; lifecycle rewritten as one global controller; pointer/viewport fixes; overlay + stale class mutations removed.
- `src/layouts/BaseLayout.astro` — renders the fixed canvas at body level; reads `data-hero-animation` from `<body>`; `?s=` redirect script in `<head>`; bottom padding on `<main>`.
- `src/styles/global.css` — viewport-fixed content scrim on `<main>` (`background-attachment: fixed`) with `@supports` fallback for `color-mix`; footer spacing.
- `src/pages/search.astro` — compact header, autofocus (guarded), accept `?s=` (canonical) with `?q=` fallback.
- `src/pages/index.astro` — `SearchAction` schema `?q=` → `?s=`.
- All 16 pages calling `<HeroCanvas animation="…">` — replace with a `data-hero-animation="…"` attribute on `<body>` (prop through BaseLayout) so the body-level canvas knows which animation to run.
- `src/components/ScrollReveal.astro` — expose the observer via a document event so infinite-scroll appends can be observed.
- `src/pages/blog/[...page].astro` + `src/pages/blog/tag/[tag]/[...page].astro` — `data-post-list` / `data-post-item` selectors; visible "Older posts" fallback that the IO fetcher progressively enhances; stripped prev/next on pages 2+.
- `src/components/Pagination.astro` — add a prop to suppress the numbered window (for pages 2+ direct-visitor fallback).

No content-collection schema changes. No new dependencies. No worker changes.

---

## Workstream 1 — Full-viewport background vis + footer spacing

### Current behaviour

`HeroCanvas.astro` renders (inside each page's hero `<section>`, which is inside `<main>`):

```html
<div class="hero-canvas-wrap absolute inset-0 z-0" data-animation="…">
  <canvas id="hero-canvas" class="absolute inset-0 h-full w-full" aria-hidden="true"></canvas>
  <div class="hero-canvas-overlay pointer-events-none absolute inset-0 z-[1]"></div>
</div>
```

The wrap is `absolute inset-0` of the hero `<section>`. The canvas only paints within that section. `.hero-canvas-overlay` (a component-local `<style>`, lines 32–46) fades `transparent → --color-surface` so the vis fades out at the hero's bottom edge. Below the hero, the body's `--color-surface` background covers everything.

### Reference (failure-first)

```css
#sensor-grid-bg {            /* <canvas> at body level, sibling of <main> */
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  z-index: -1; pointer-events: none;
}
main {
  position: relative; z-index: 1;
  background: linear-gradient(to bottom,
    rgba(5,8,16,0) 0px, rgba(5,8,16,0.55) 300px, rgba(5,8,16,0.88) 600px);
}
```

One fixed full-viewport canvas at body level behind everything; `main` has a top-transparent gradient scrim so the vis bleeds through the hero and fades for content readability.

### Target design (revised after QA)

**CRITICAL — canvas moves to body level.** CSS painting order within a stacking context paints an element's own background (step 1) *before* its descendants (step 6+). A canvas that is a DOM descendant of `<main>` paints **on top of** main's background — the scrim would sit behind the canvas and do nothing; the vis would show through everywhere. The reference works because its canvas is a **sibling** of `<main>` at body level, with `main { z-index: 1 }` above `z-index: -1` canvas. So:

- **`BaseLayout.astro`** renders the canvas once at body level, before `<Header>`:
  ```html
  <body data-hero-animation={props.heroAnimation || ''} class="flex min-h-screen flex-col">
    <canvas id="hero-canvas" class="hero-canvas-bg" aria-hidden="true"></canvas>
    <Header />
    <main id="main-content" class="flex-1">…</main>
    <Footer />
  ```
  ```css
  .hero-canvas-bg { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
  main { position: relative; z-index: 1; }
  ```
- **Pages pass the animation via BaseLayout prop**, not by rendering `<HeroCanvas>` inside the hero. Each of the 16 pages adds `heroAnimation="terrain"` (etc.) to its `<BaseLayout>` call and removes the `<HeroCanvas …/>` line from its hero `<section>`. The hero `<section>` keeps its `min-h-[100dvh]`/`50dvh` and `relative z-10` text — it now sits transparently over the fixed canvas.
- **`HeroCanvas.astro` becomes a single global controller** (init script only; no markup of its own, since the canvas lives in BaseLayout). It reads `document.body.dataset.heroAnimation` to pick the animation. The 16 animation modules (flow/terrain/ink/…) are unchanged.

**CRITICAL — fix the pause-on-scroll bug.** `HeroCanvas.astro:3773–3781` creates an `IntersectionObserver` that observes the hero `section` (which scrolls away), setting `inViewport=false` when you scroll past the hero — freezing the vis exactly when the user scrolls down to see it at the bottom. Fix: with a body-level fixed canvas there is no section to observe. **Remove the IntersectionObserver entirely** and set `inViewport = true` unconditionally; reset `inViewport = true; isVisible = pageVisible` in `initCanvas()` so a stale `false` can't survive a VT swap. The loop pauses only on `document.visibilityState === 'hidden'` (tab backgrounded, lines 3883–3886) and `prefers-reduced-motion` (CSS `display:none` on the wrap, already in `global.css`).

**MAJOR — fix pointer/touch tracking.** Mouse (lines 3825–3839) and touch (3842–3867) handlers normalize against `section.getBoundingClientRect()`. After scrolling past the hero, `rect.top` is negative so the hit-test fails and `mouseActive` stays false — mouse-reactive animations (flow vortex, terrain gravity, stream rock, …) stop responding at the bottom of the page, exactly where the vis is now visible. Fix: normalize against the viewport since the canvas is fixed and fills it:
```js
mouseRawX = e.clientX / window.innerWidth;
mouseRawY = e.clientY / window.innerHeight;
mouseActive = true;
```
Drop the `canvas.closest('section')` lookup entirely from both handlers.

**MAJOR — viewport-relative scrim (fix `flex-1` short-page bug).** `<main class="flex-1">` (BaseLayout:83) expands to fill `100dvh − header` on short pages (privacy, colophon, 404). A gradient with `100%`-relative stops would anchor its bottom band to main's flex-expanded height, making the transparent bottom band consume most of a short page and destroying readability. Fix: **`background-attachment: fixed`** on the `<main>` gradient so the stops are viewport-relative regardless of page length — transparent at the top of the viewport, opaque through the readable middle, transparent at the bottom of the viewport. This matches the fixed-canvas concept and is stable on short and long pages.

**MINOR — `color-mix` fallback.** The scrim uses `color-mix()`. On browsers without it the whole `background` declaration is invalid → main transparent → vis shows through fully. Add a plain-gradient fallback first, then an `@supports (background: color-mix(in srgb, red 50%, blue))` override — mirroring the existing `.hero-canvas-overlay` pattern (lines 36–46).

**MINOR — remove `.hero-canvas-overlay` and stale class mutations.** The overlay is component-local markup + style in `HeroCanvas.astro` (line 29 + lines 32–46); remove both, since the scrim now lives in `global.css` on `<main>`. `initCanvas()` (line 3732) removes `hero-glow` and adds `overflow-hidden` to the section; `destroyCanvas()` (3706) adds `hero-glow` back unconditionally — with a body-level canvas these are stale and `destroyCanvas`'s unconditional add can inject `hero-glow` onto pages that never had it. Remove these mutations.

**MAJOR — single-init lifecycle for VT.** There is a persistent `astro:after-swap` listener (3899) plus an unconditional `initCanvas()` (3906); with `is:inline` re-execution on swaps, old and new closures can both init loops. Fix: make HeroCanvas a single global controller guarded by a `documentElement.dataset.heroCanvasInit` sentinel for the swap listener, and have `initCanvas()` tear down the previous run (cancel raf, cleanup the prior animation module) before starting the new one. One init path per swap.

### Footer spacing — `BaseLayout.astro`

- Add bottom padding to `<main>` (e.g. `pb-[20dvh]`) so the viewport-fixed transparent bottom band has room and the vis is clearly visible in the gap before the footer. This is the "more space between content and footer" fix.
- `<Footer>` stays opaque (`bg-surface-alt/50`). The vis shows in the gap above it, not through it.

### Tradeoffs

- **Animation loop never pauses via IntersectionObserver** (fixed canvas always in view). Mitigated by the tab-visibility pause and reduced-motion gate. GPU cost is roughly unchanged — the hero canvas was already near-viewport-sized.
- **Card-heavy pages (projects, blog list) hide most of the vis** behind cards in the opaque middle band. Intended (readability) — the vis is the hero + bottom gap, not the whole page.
- **Light mode:** the scrim uses `--color-surface` (light cream) so cards/text keep WCAG AA. The existing light-mode accent `#8a5e42` is unchanged.

---

## Workstream 2 — Search UX (`?s=` + focus + de-jank)

### `?s=` redirect (BaseLayout `<head>`)

A **bare** `is:inline` script in `<head>`, before `<ClientRouter />` (BaseLayout:71), **not sentinel-guarded** (it must run on every navigation, including VT swaps to `/?s=term`; a sentinel would suppress it after first load):

```js
(function () {
  var p = new URLSearchParams(location.search);
  var s = p.get('s');
  if (s != null && location.pathname !== '/search/') {
    location.replace('/search/?s=' + encodeURIComponent(s));
  }
})();
```

- `location.replace` triggers a full load (not VT) and doesn't clutter history.
- Only fires off-`/search/` (avoids a loop). On `/search/`, the page's own script reads `?s=`.

### `/search/` — accept `?s=` (canonical) + `?q=` (fallback), compact header, guarded autofocus

`src/pages/search.astro`:

- **Canonical param is `s`:** read `s` first, then `q` as fallback (the spec previously waffled between `q || s` and `s || q` — it is `s || q`):
  ```js
  var term = new URLSearchParams(window.location.search).get('s')
          || new URLSearchParams(window.location.search).get('q');
  if (term && typeof ui.triggerSearch === 'function') ui.triggerSearch(term);
  ```
- **Compact header:** replace the `min-h-[50dvh]` hero with a compact header (keep radar `HeroCanvas` small, e.g. `min-h-[28dvh]`) so the search box sits near the top of the page.
- **Guarded autofocus:** `PagefindUI` constructs its DOM synchronously, so the input exists after `mountUI()`. But focusing on every `astro:page-load` steals focus from users navigating back or using assistive tech. Guard it: focus only when `/search/` is the entry navigation (not a back/forward), only when no element is meaningfully focused, defer until `.pagefind-ui__search-input` exists, and use `el.focus({ preventScroll: true })`.
- **Skeleton flash:** the skeleton is removed the instant `mountUI()` succeeds (already done via `sk.remove()`). No change beyond the param/focus work.
- **Focus across VT:** the existing `astro:page-load` re-init stays; the guard above handles focus restore correctly.

### Homepage SearchAction schema — `index.astro`

Change `urlTemplate` from `https://adrianwedd.com/search/?q={search_term_string}` to `https://adrianwedd.com/search/?s={search_term_string}`. Old `?q=` bookmarks keep working because `/search/` reads `q` as fallback, and the redirect only fires off-`/search/`.

---

## Workstream 3 — Pagination → infinite scroll (blog + tag pages)

### Current behaviour

`src/pages/blog/[...page].astro` uses Astro `paginate(posts, { pageSize: 12 })`, generating `/blog/`, `/blog/2/`, … with the numbered `Pagination.astro` component. Tag pages (`/blog/tag/[tag]/[...page].astro`) do the same. Blog articles are wrapped in `<ScrollReveal>` (`opacity:0` until revealed); tag articles are not (asymmetry noted).

### Target design

Keep the static paginated routes as the data source and no-JS fallback. On **page 1 only**, replace the numbered `Pagination` with a visible **"Older posts" link** that the IntersectionObserver fetcher progressively enhances. The link is the no-JS fallback *and* the JS-enabled fallback if IO/fetch fails — a bare sentinel + `<noscript>` would strand JS users when IO is blocked.

**Stable selectors (added first):** add `data-post-list` to the post-list `<div>` and `data-post-item` to each `<article>` in both `blog/[...page].astro` and `blog/tag/[tag]/[...page].astro`. The fetcher queries `[data-post-list] > [data-post-item]` from the fetched page.

**Page 1 markup:**
```html
<a href="/blog/2/" rel="next" data-older-link data-next-url="/blog/2/">Older posts →</a>
<noscript><!-- the link above is the no-JS fallback, always present --></noscript>
```

**Inline fetcher (VT-safe: `documentElement.dataset` sentinel, event delegation, lazy DOM lookups, `astro:after-swap` re-init):**
- Observe `[data-older-link]` with an IntersectionObserver (rootMargin to pre-fetch before reaching it).
- On intersect: read `data-next-url`; `fetch(url)`, parse `text/html`.
- Extract `[data-post-list] > [data-post-item]` from the fetched doc; append to the page-1 `[data-post-list]`.
- **Reveal appended nodes:** dispatch a `adrianwedd:content-appended` CustomEvent with the appended nodes (see ScrollReveal change below). For blog (ScrollReveal-wrapped) the observer reveals them; for tag (no wrapper) they're visible by default.
- **Read the next next-URL** from the fetched page's `a[rel="next"]` (Pagination.astro:74–76 renders it; on the last page it's a disabled `<span>`, so absence = end). Update `[data-older-link]`'s `data-next-url` and `href`; if no next, hide the link and disconnect the observer.
- **Do NOT use `history.pushState`.** Manually pushing state without coordinating with the ClientRouter breaks back/forward (a back-press would VT-swap to `/blog/2/` — a different layout from the infinite-scrolled page 1). Keep the URL at `/blog/`; scroll position is the implicit state. The "refresh lands on the right page" nicety isn't worth breaking VT.

**Tag pages:** identical treatment, parameterised by the tag path. The fetcher's extraction handles both DOM shapes (blog articles have an extra `.scroll-reveal` wrapper, tag articles don't) because it copies `[data-post-item]` outerHTML, preserving each structure.

**Pages 2+:** pass a `numbers={false}` prop to `Pagination` (new prop) so direct visitors and no-JS users get a stripped "Newer / Older" pair without the numbered window.

### ScrollReveal change — expose the observer

`src/components/ScrollReveal.astro`: the IntersectionObserver is a private IIFE var (line 17); it only re-runs `querySelectorAll('.scroll-reveal:not(.revealed)')` on initial load and `astro:after-swap` (line 41), so dynamically appended nodes stay `opacity:0` forever. Fix: add a document listener that re-scans on demand:
```js
document.addEventListener('adrianwedd:content-appended', function (e) {
  var nodes = (e.detail && e.detail.nodes) || [];
  nodes.forEach(function (n) {
    n.querySelectorAll('.scroll-reveal:not(.revealed)').forEach(function (el) { observer.observe(el); });
    if (n.classList && n.classList.contains('scroll-reveal') && !n.classList.contains('revealed')) observer.observe(n);
  });
});
```
Register this listener once (inside the existing sentinel guard). The infinite-scroll fetcher dispatches it after appending.

### Edge cases

- **VT swap mid-fetch:** guard with the sentinel dataset; if the page changes before the fetch resolves, drop the result (don't append stale HTML).
- **Filter/tag toggle on blog page 1:** the blog tag chips are links (`/blog/tag/{tag}/`), so filtering navigates to a new page — infinite scroll re-inits cleanly. No interaction.
- **Pagefind:** indexes the static pages, not JS-appended content — search results still link to canonical paginated URLs. Appended posts are duplicate DOM of already-indexed pages, not separate URLs. Fine.

---

## Workstream 4 — Footer spacing

Folded into Workstream 1: bottom padding on `<main>` + the viewport-fixed transparent bottom scrim band produce the gap. No separate work.

---

## Testing / verification

No Astro test suite. Verification is manual + the existing CI gates:

- `npm run dev` — eyeball each affected page: hero vis visible, vis visible in the bottom gap before footer, cards readable in the middle, footer spacing increased. Scroll past the hero and confirm the vis keeps animating and mouse-reactive animations still respond at the bottom.
- `npm run build` — build passes; Pagefind index still generated.
- `npm run lint` / `npm run format:check` — pass.
- `node scripts/validate-content.js` — unaffected, run for safety.
- `npm run check:links` — internal-link check passes (infinite scroll doesn't add/remove URLs; paginated routes still exist).
- Lighthouse (`npm run build && npm run lighthouse`) — CLS within budget; the fixed canvas + viewport-fixed scrim shouldn't shift content. Confirm no perf regression from the always-on canvas.
- Browser manual: `/search/?s=make+search+work+like+this` runs the search and focuses the input (guard honored); `/?s=…` redirects there; `/blog/` scrolls to load page 2, 3, …; URL stays at `/blog/`; appended posts fade in; back button returns to the previous page cleanly (no VT breakage); JS-disabled `/blog/` shows the "Older posts" link to `/blog/2/`.
- `prefers-reduced-motion` — the canvas wrap is `display:none` (existing rule); confirm the page still reads correctly with no canvas.
- Light mode — scrim uses `--color-surface` (cream); confirm WCAG AA preserved.

## Out of scope (next session)

- Implementation plan (breakdown into commits, ordering, verification steps) — written via the `writing-plans` skill in the next session.
- Any worker / CSP / deploy changes — none needed.
- Renaming `?q=` → `?s=` on other references — only the homepage schema and the `/search/` script reference `q`; both handled.

## QA provenance

- **Codex** (security/correctness): 13 issues, all incorporated — VT double-init, stale class mutations, component-local overlay, `color-mix` fallback, redirect placement, `s || q`, autofocus guard, stable selectors, ScrollReveal exposure, pages-2+ stripped pagination, page-1 visible fallback.
- **Hermes** (cross-referencing): 8 must-fixes, all incorporated — body-level canvas, IO observes section, viewport coords, `flex-1` gradient break, redirect not sentinel-guarded, private ScrollReveal observer, `pushState` breaks ClientRouter, stable selector.
- **Agy** (design/accessibility): stalled — produced no usable output ("searching for the spec…"). Re-run next session if wanted; the Hermes + Codex coverage was thorough and overlapping.