# Search, full-viewport background vis, and pagination UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the hero background visualisations span the full viewport (visible in the gap above the footer), fix search deep-linking (`?s=`) and focus, replace numbered blog/tag pagination with infinite scroll, and add breathing room between content and footer.

**Architecture:** Move `HeroCanvas` from a per-page hero-scoped `<canvas>` to a single body-level `position: fixed` canvas rendered by `BaseLayout`, with an element-relative (`%`-stops) content scrim on `<main>` so the vis bleeds through the hero and the bottom gap above the footer but stays opaque over the readable middle. Pages declare their animation via a `heroAnimation` prop instead of rendering `<HeroCanvas>`. Blog/tag page 1 gets a visible "Older posts" link that an IntersectionObserver fetcher progressively enhances into infinite scroll (no `pushState` — keeps the ClientRouter intact); paginated routes stay as the data source + no-JS fallback.

**Tech Stack:** Astro 6, Tailwind CSS 4 (CSS custom properties via `@theme` — no `dark:` prefix), Preact islands, Pagefind, View Transitions (`is:inline` re-execution + `documentElement.dataset` sentinels).

## Global Constraints

- **No Astro test suite.** Verification is manual (`npm run dev`) + the existing CI gates: `npm run build`, `npm run lint`, `npm run format:check`, `node scripts/validate-content.js`, `npm run check:links`. Each task's verification section lists the exact commands and the manual eyeball checks. This is a deliberate adaptation — the spec says "No Astro test suite. Verification is manual + the existing CI gates."
- **Never use Tailwind's `dark:` prefix** — theming is CSS custom properties in `src/styles/global.css`; `.light` on `<html>` overrides.
- **VT-safe inline scripts:** `is:inline`, `documentElement.dataset.<name>Init` sentinel for global listeners, event delegation on `document`, lazy DOM lookups (no cached element refs), `astro:after-swap` re-init inside the sentinel guard. See `CLAUDE.md` → "View Transitions compatibility".
- **No `pushState`/`replaceState` in the infinite-scroll fetcher** — it breaks the Astro ClientRouter's back/forward coordination.
- **`slug()` from `src/lib/utils.ts`** for any href derived from a content-collection ID (IDs include `.md`).
- **No content-collection schema changes. No new dependencies. No worker/CSP changes.** Canonical search param is `s` (with `q` as fallback for old bookmarks).
- **Permalink rule:** paginated routes (`/blog/2/`, `/blog/tag/{tag}/2/`, …) are retained — do not remove them.

---

## File Structure

- `src/layouts/BaseLayout.astro` — adds `heroAnimation?: string` prop; renders `<canvas id="hero-canvas" class="hero-canvas-bg">` at body level before `<Header>`; sets `data-hero-animation` on `<body>`; adds `pb-[240px]` to `<main>`; imports the HeroCanvas controller; adds the `?s=` redirect `<script is:inline>` in `<head>`.
- `src/styles/global.css` — `.hero-canvas-bg` (fixed full-viewport, `z-index: -1`), `main` element-relative scrim with `@supports (color-mix …)` fallback, reduced-motion/print rules repointed at `.hero-canvas-bg` (dead `.hero-canvas-wrap` selectors removed).
- `src/components/Footer.astro` — `bg-surface-alt/50` → `bg-surface` (opaque) so the vis shows in the gap above, not through the footer.
- `src/components/HeroCanvas.astro` — controller-only `<script is:inline>` (remove the `<div class="hero-canvas-wrap">` markup + component-local `<style>`); reads `document.body.dataset.heroAnimation`; viewport-relative sizing/pointer; no IntersectionObserver; single-init lifecycle.
- 16 pages (listed in Task 3) — add `heroAnimation="…"` to `<BaseLayout>`, remove the `<HeroCanvas animation="…"/>` line + its import.
- `src/pages/search.astro` — compact header (`min-h-[50dvh]` → `min-h-[28dvh]`), read `s || q`, guarded autofocus, keep `radar` animation via the new prop.
- `src/pages/index.astro` — `SearchAction` `urlTemplate` `?q=` → `?s=`.
- `src/components/Pagination.astro` — add `numbers?: boolean` (default `true`); suppress the numbered window when `false`.
- `src/components/ScrollReveal.astro` — register a `document` listener for `adrianwedd:content-appended` that observes freshly appended `.scroll-reveal` nodes.
- `src/components/InfiniteScroll.astro` (new) — renders the "Older posts" `<a>` + the VT-safe IO fetcher `<script is:inline>`.
- `src/pages/blog/[...page].astro` — `data-post-list`/`data-post-item`; page 1 → `<InfiniteScroll>`, pages 2+ → `<Pagination numbers={false}>`.
- `src/pages/blog/tag/[tag]/[...page].astro` — same as above, parameterised by tag path.

---

## Task 1: Full-viewport vis core — BaseLayout canvas + scrim + HeroCanvas controller rewrite

This task delivers working background vis end-to-end. After it, the body-level canvas animates on every page (auto-rotating, since pages don't pass `heroAnimation` yet — Task 3 fixes the per-page animation). The 16 dead `<HeroCanvas animation="…"/>` calls still render nothing and are removed in Task 3.

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (frontmatter Props, `<body>`, `<main>`, import HeroCanvas)
- Modify: `src/styles/global.css` (add `.hero-canvas-bg`, `main` scrim, reduced-motion/print additions)
- Modify: `src/components/Footer.astro` (opaque background)
- Modify: `src/components/HeroCanvas.astro` (remove markup + `<style>`, rewrite controller: sizing, pointer, IO removal, lifecycle)

**Interfaces:**
- Produces: `<BaseLayout heroAnimation="terrain">` prop (string, optional) → `<body data-hero-animation="terrain">`. The HeroCanvas controller reads `document.body.dataset.heroAnimation` to pick the animation (matches the old `ANIM_KEYS` names: `terrain|flow|soundwave|strata|forge|signal|ink|blueprint|radar|entropy|cipher|orbit|loom|pulse|stream|crystallise|dataflow`). Task 3 consumes this prop on all 16 pages.

- [ ] **Step 1: BaseLayout — add the `heroAnimation` prop and render the body-level canvas**

In `src/layouts/BaseLayout.astro`, add `heroAnimation?: string` to the Props interface (after `preloadImage?: string;`):

```ts
interface Props {
  title: string;
  description: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: 'website' | 'article';
  publishedDate?: string;
  tags?: string[];
  noindex?: boolean;
  preloadImage?: string;
  heroAnimation?: string;
}
```

Add the HeroCanvas import at the top of the frontmatter (the component becomes a controller-only script; importing it is what emits the controller `<script is:inline>`):

```astro
import HeroCanvas from '../components/HeroCanvas.astro';
```

Change the `<body>` opening tag and the `<main>` opening tag (currently lines 73 and 83) to:

```astro
<body data-hero-animation={props.heroAnimation || ''} class="flex min-h-screen flex-col">
  <canvas id="hero-canvas" class="hero-canvas-bg" aria-hidden="true"></canvas>
```

and

```astro
<main id="main-content" class="flex-1 pb-[240px]">
```

Then render the HeroCanvas controller once at body level — add `<HeroCanvas />` immediately **after** the `<Footer />` line (so the controller script is emitted once per page; its markup is empty after Task 1's HeroCanvas rewrite):

```astro
<Footer />
<HeroCanvas />
<ConsentBanner />
```

- [ ] **Step 2: BaseLayout — add the `?s=` redirect script in `<head>`**

In `src/layouts/BaseLayout.astro`, insert this bare inline script in `<head>` **before** the `<ClientRouter />` line (currently line 71). It is **not** sentinel-guarded (it must run on every navigation including VT swaps to `/?s=term`; a sentinel would suppress it after first load). Critically, add `data-astro-rerun`: a plain `<script is:inline>` in `<head>` is present on every page (BaseLayout renders it site-wide), so on a VT swap the ClientRouter leaves already-present head scripts in place and does **not** re-execute them (per Astro's documented View Transitions script behaviour). Without `data-astro-rerun`, a VT-swap to `/?s=term` would not fire the redirect. `data-astro-rerun` forces the script to re-execute after every transition (it also implicitly makes the script inline, so `is:inline` is kept only for explicitness):

```astro
{/* Deep-link redirect: /?s=term → /search/?s=term.
   data-astro-rerun: the script is in <head> on every page, so without it the
   ClientRouter would leave the existing head script in place and not re-run
   it on a VT swap to /?s=term. Re-runs on every transition (cheap: one
   URLSearchParams parse, no-op unless ?s= is present and we're off /search/). */}
<script is:inline data-astro-rerun>
  (function () {
    var p = new URLSearchParams(location.search);
    var s = p.get('s');
    if (s != null && location.pathname !== '/search/') {
      location.replace('/search/?s=' + encodeURIComponent(s));
    }
  })();
</script>
<ClientRouter />
```

- [ ] **Step 3: global.css — add `.hero-canvas-bg` and the `main` scrim**

In `src/styles/global.css`, add the following block inside `@layer utilities` (lines 167–301), right after the `.section-divider { … }` block (line 206) and before `@keyframes fade-up` (line 219). (This matches the project convention: the existing `.hero-glow`, `.scroll-reveal`, `.section-divider`, and the reduced-motion `.hero-canvas-bg` override (Step 4a) all live in `@layer utilities` — keeping the definition in the same layer is tidy.)

```css
  /* Body-level fixed background canvas. z-index: -1 puts it behind all in-flow
     content (Layer 3) — including the non-positioned <footer> — so the vis shows
     only in the transparent hero + bottom-gap bands of the main scrim, never
     through the opaque footer. The canvas paints above the body's background
     (Layer 1) but below all in-flow content; the header (sticky z-50) and
     main (position: relative; z-index: 1) both sit above it. This matches the
     reference site's #sensor-grid-bg { z-index: -1 } technique. */
  .hero-canvas-bg {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    pointer-events: none;
  }

  main {
    position: relative;
    z-index: 1;
    /* Element-relative scrim: transparent over the hero (top) + the bottom gap above
       the footer, opaque over the readable middle. Stops are % of <main>'s own box, so
       the bottom transparent band always sits at the bottom of <main> = the gap above
       the footer, regardless of page length or footer height. flex-1 makes <main> fill
       the viewport on short pages, so the band reaches the viewport bottom there too.
       (Owner decision 2026-06-25 after Hermes+Agy QA: Agy showed a viewport-fixed
       (`background-attachment: fixed`) band gets covered by the opaque footer when
       scrolled to the bottom of a long page, so the vis never bleeds through the gap;
       element-relative % stops bind the band to the gap above the footer instead.) */
    background: linear-gradient(
      to bottom,
      transparent 0px,
      var(--color-surface) 280px,
      var(--color-surface) calc(100% - 220px),
      transparent 100%
    );
  }
  @supports (background: color-mix(in srgb, red 50%, blue)) {
    main {
      background: linear-gradient(
        to bottom,
        transparent 0px,
        color-mix(in srgb, var(--color-surface) 60%, transparent) 220px,
        var(--color-surface) 360px,
        var(--color-surface) calc(100% - 320px),
        color-mix(in srgb, var(--color-surface) 60%, transparent) calc(100% - 180px),
        transparent 100%
      );
    }
  }
```

- [ ] **Step 4: global.css — point the reduced-motion and print rules at the new canvas class (remove dead selectors)**

HeroCanvas no longer emits `.hero-canvas-wrap` / `.hero-canvas-overlay` markup (Step 6 removed it), so the global.css rules referencing `.hero-canvas-wrap` are now dead. Remove them and point the reduced-motion hide at the new class instead. (This also makes the Task 10 cleanup grep for `hero-canvas-wrap|hero-canvas-overlay` return nothing.)

(a) In the `@media (prefers-reduced-motion: reduce)` block inside `@layer utilities` (global.css lines 288–291), replace the `.hero-canvas-wrap, .hero-canvas-switcher` selector with `.hero-canvas-switcher, .hero-canvas-bg` (drop the dead `.hero-canvas-wrap`, add `.hero-canvas-bg` so a reduced-motion user gets no canvas):

```css
    .hero-canvas-switcher,
    .hero-canvas-bg {
      display: none !important;
    }
```

(Leave `.hero-canvas-switcher` as-is — it is pre-existing dead CSS, out of scope for this spec; the Task 10 cleanup grep does not check it.)

(b) In the `@media print` block (global.css lines 330–339), remove the `.hero-canvas-wrap,` line (331). The canvas keeps `id="hero-canvas"`, which is already in that print-hide selector, so it stays hidden in print — no replacement needed. The selector becomes:

```css
  #hero-canvas,
  .hero-canvas-switcher,
  .mobile-menu,
  .mobile-menu-btn,
  [data-pagefind-ui],
  audio,
  video {
    display: none !important;
  }
```

(c) **Print regression fix:** Step 3 adds `main { background: linear-gradient(…, var(--color-surface) …); }` (element-relative). The existing `@media print` block (global.css lines 342–346) sets `main { max-width: 100% !important; padding: 0 !important; … }` but never clears `background`. In dark mode `--color-surface` is `#1a181c`, so in print the gradient's opaque middle band would paint dark behind the forced black text → unreadable. Add `background: none !important;` to that print `main` rule:

```css
  main {
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    background: none !important;
  }
```

(The print block is unlayered, so it beats the `@layer utilities` rule anyway, but `!important` is consistent with the surrounding print rules.)

- [ ] **Step 5: Footer.astro — opaque background**

In `src/components/Footer.astro`, change the `<footer>` class from `bg-surface-alt/50` to `bg-surface` so the fixed canvas does not bleed through the footer (the vis shows in the gap above the footer, not through it):

```astro
<footer class="bg-surface mt-auto border-t border-border">
```

- [ ] **Step 6: HeroCanvas — remove the markup and component-local `<style>`**

In `src/components/HeroCanvas.astro`, delete the entire frontmatter `interface Props { … }` + `const { animation } = Astro.props;` block, the `<div class="hero-canvas-wrap …">…</div>` markup, and the component-local `<style>…</style>` (i.e. remove everything from line 1 through line 47 except keep the `<script is:inline>` that follows). The file becomes just:

```astro
<script is:inline>
  (function () {
    // …controller body (unchanged IIFE wrapper, edits below)…
  })();
</script>
```

The canvas now lives in `BaseLayout.astro` (`<canvas id="hero-canvas" class="hero-canvas-bg">`); the overlay is replaced by the `main` scrim in `global.css`.

- [ ] **Step 7: HeroCanvas — make `sizeCanvas` viewport-relative**

In `src/components/HeroCanvas.astro`, replace the `sizeCanvas` function (the version taking `(canvas, section)`) with a viewport-relative version:

```js
    function sizeCanvas(canvas) {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasW = window.innerWidth;
      canvasH = window.innerHeight;
      canvas.width = canvasW * dpr;
      canvas.height = canvasH * dpr;
      canvas.style.width = canvasW + 'px';
      canvas.style.height = canvasH + 'px';
    }
```

- [ ] **Step 8: HeroCanvas — rewrite `initCanvas` (no section, no IO, read body dataset, self-teardown)**

In `src/components/HeroCanvas.astro`, replace the entire `initCanvas()` function with the version below. Key changes: calls `destroyCanvas()` first (single-init lifecycle — one teardown-then-setup per swap); no `canvas.closest('section')` (the canvas is body-level); reads the animation from `document.body.dataset.heroAnimation`; resets `inViewport`/`isVisible` so a stale `false` can't survive a VT swap; removes the `section` class mutations (`hero-glow`/`overflow-hidden`); removes the IntersectionObserver entirely.

```js
    function initCanvas() {
      // Single-init lifecycle: tear down any previous run before starting the new one.
      destroyCanvas();

      var canvas = document.getElementById('hero-canvas');
      if (!canvas) return;

      // Reduced motion check
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      var ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Reset viewport/pause state so a stale false can't survive a VT swap.
      inViewport = true;
      isVisible = pageVisible;

      readColors();
      sizeCanvas(canvas);

      // Pick animation — fixed if body has data-hero-animation, otherwise rotate
      var fixedAnim = document.body.dataset.heroAnimation || '';
      var fixedIndex = fixedAnim ? ANIM_KEYS.indexOf(fixedAnim) : -1;
      var startIndex;
      if (fixedIndex >= 0) {
        startIndex = fixedIndex;
      } else {
        var stored = null;
        try {
          stored = sessionStorage.getItem('adrianwedd_heroAnimation');
        } catch (e) {}
        startIndex = stored !== null ? parseInt(stored, 10) : 0;
      }
      if (isNaN(startIndex) || startIndex < 0 || startIndex >= ANIM_KEYS.length) startIndex = 0;
      currentIndex = startIndex;

      var anim = getAnim(ANIM_KEYS[currentIndex]);
      try {
        anim.init(canvasW, canvasH, colors);
      } catch (e) {
        console.warn('HeroCanvas init error:', e);
      }
      // Theme change observer (re-created on each init since destroyCanvas disconnects it)
      themeObs = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].attributeName === 'class') {
            readColors();
            break;
          }
        }
      });
      themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

      // No IntersectionObserver — the body-level fixed canvas is always in view.
      // The loop pauses only on tab-hidden (visibilitychange) and prefers-reduced-motion.

      // Start render loop
      adaptiveQuality = 1.0;
      fastFrameCount = 0;
      startLoop(canvas, ctx);

      // Auto-rotate through animations every 30 seconds (only when not locked)
      if (autoRotateTimer) clearInterval(autoRotateTimer);
      if (fixedIndex < 0) {
        autoRotateTimer = setInterval(function () {
          if (!isVisible) return;
          var nextIdx = (currentIndex + 1) % ANIM_KEYS.length;
          var c = document.getElementById('hero-canvas');
          if (!c) return;
          var x = c.getContext('2d');
          if (!x) return;
          switchAnimation(nextIdx, c, x);
        }, 30000);
      }
    }
```

- [ ] **Step 9: HeroCanvas — strip the section class mutations from `destroyCanvas`**

In `src/components/HeroCanvas.astro`, in `destroyCanvas()`, delete the block that looked up the section and toggled `overflow-hidden` / `hero-glow` (the `var canvas = document.getElementById('hero-canvas'); if (canvas) { var section = canvas.closest('section'); if (section) { section.classList.remove('overflow-hidden'); section.classList.add('hero-glow'); } }` block — with a body-level canvas these are stale, and the unconditional `add('hero-glow')` could inject `hero-glow` onto pages that never had it). Keep the rest of `destroyCanvas` (cancel `rafId`, `clearInterval(autoRotateTimer)`, disconnect `themeObs`, `anim.cleanup()`, reset pointer state, `currentIndex = -1`). Also delete the `if (intersectionObs) { intersectionObs.disconnect(); intersectionObs = null; }` block (the observer no longer exists). The resulting `destroyCanvas` tail should be:

```js
      if (themeObs) {
        themeObs.disconnect();
        themeObs = null;
      }
      var anim = getAnim(ANIM_KEYS[currentIndex]);
      if (anim && anim.cleanup) {
        try {
          anim.cleanup();
        } catch (e) {}
      }
      currentIndex = -1;
      // Reset pointer state to prevent stale attractor on re-init
      mouseRawX = 0.5;
      mouseRawY = 0.5;
      mouseSmoothX = 0.5;
      mouseSmoothY = 0.5;
      mouseActive = false;
      mouseExitFrames = 0;
      pendingIndex = -1;
```

(The `if (rafId) { cancelAnimationFrame(rafId); rafId = null; }` and `if (autoRotateTimer) { clearInterval(autoRotateTimer); autoRotateTimer = null; }` lines above this stay.)

- [ ] **Step 10: HeroCanvas — drop the `section` param from `switchAnimation`**

In `src/components/HeroCanvas.astro`, change the `switchAnimation` signature from `function switchAnimation(index, canvas, ctx, section) {` to `function switchAnimation(index, canvas, ctx) {` (the `section` param is not referenced inside the function body). The body of `switchAnimation` is otherwise unchanged.

- [ ] **Step 11: HeroCanvas — viewport-relative mouse handler**

Replace the `document.addEventListener('mousemove', function (e) { … })` handler (the version that did `canvas.closest('section')` + `rect` hit-testing) with:

```js
      // Mouse tracking — viewport-relative (canvas is fixed and fills the viewport)
      document.addEventListener('mousemove', function (e) {
        mouseRawX = e.clientX / window.innerWidth;
        mouseRawY = e.clientY / window.innerHeight;
        mouseActive = true;
        mouseExitFrames = 0;
      });
```

- [ ] **Step 12: HeroCanvas — viewport-relative touch handler**

Replace the `document.addEventListener('touchmove', function (e) { … }, { passive: true })` handler with:

```js
      // Touch tracking — viewport-relative
      document.addEventListener(
        'touchmove',
        function (e) {
          var touch = e.touches[0];
          if (!touch) return;
          mouseRawX = touch.clientX / window.innerWidth;
          mouseRawY = touch.clientY / window.innerHeight;
          mouseActive = true;
          mouseExitFrames = 0;
        },
        { passive: true },
      );
```

The `touchend` / `touchcancel` / `mouseleave` handlers that set `mouseActive = false` stay as-is.

- [ ] **Step 13: HeroCanvas — viewport-relative resize handler**

Replace the resize handler's body so it calls `sizeCanvas(canvas)` without the section lookup:

```js
      window.addEventListener('resize', function () {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
          resizeTimeout = null;
          var canvas = document.getElementById('hero-canvas');
          if (!canvas) return;
          sizeCanvas(canvas);
          var anim = getAnim(ANIM_KEYS[currentIndex]);
          try {
            anim.init(canvasW, canvasH, colors);
          } catch (e) {}
        }, 200);
      });
```

- [ ] **Step 14: HeroCanvas — single-init lifecycle (remove the duplicate bottom init)**

The current end of the IIFE has a sentinel-guarded listener block **plus** an unconditional `initCanvas()` at the very bottom (the line `initCanvas();` just before `})();`). With `is:inline` re-execution on VT swaps, that bottom call runs on every swap **and** the `astro:after-swap` listener (inside the sentinel block) also runs — two inits per swap, and old/new closures both start loops. Fix: remove the unconditional bottom `initCanvas();` line, move first-load init inside the sentinel block, and simplify the `astro:after-swap` handler to just `initCanvas()` (which now self-tears-down via the `destroyCanvas()` call at its start).

Replace the sentinel-guarded block + bottom init (from `// --- Sentinel-guarded global listeners …` through the end of the IIFE) with:

```js
    // --- Sentinel-guarded global listeners (registered once, survive VT swaps) ---
    if (!document.documentElement.dataset.heroCanvasInit) {
      document.documentElement.dataset.heroCanvasInit = '1';

      // Resize handler (debounced 200ms — avoids iOS Safari toolbar churn)
      window.addEventListener('resize', function () {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
          resizeTimeout = null;
          var canvas = document.getElementById('hero-canvas');
          if (!canvas) return;
          sizeCanvas(canvas);
          var anim = getAnim(ANIM_KEYS[currentIndex]);
          try {
            anim.init(canvasW, canvasH, colors);
          } catch (e) {}
        }, 200);
      });

      // Mouse tracking — viewport-relative (canvas is fixed and fills the viewport)
      document.addEventListener('mousemove', function (e) {
        mouseRawX = e.clientX / window.innerWidth;
        mouseRawY = e.clientY / window.innerHeight;
        mouseActive = true;
        mouseExitFrames = 0;
      });

      // Touch tracking — viewport-relative
      document.addEventListener(
        'touchmove',
        function (e) {
          var touch = e.touches[0];
          if (!touch) return;
          mouseRawX = touch.clientX / window.innerWidth;
          mouseRawY = touch.clientY / window.innerHeight;
          mouseActive = true;
          mouseExitFrames = 0;
        },
        { passive: true },
      );

      document.addEventListener('touchend', function () {
        mouseActive = false;
      });

      document.addEventListener('touchcancel', function () {
        mouseActive = false;
      });

      document.addEventListener('mouseleave', function () {
        mouseActive = false;
      });

      // Pause the render loop + auto-rotate when the tab is backgrounded (battery).
      document.addEventListener('visibilitychange', function () {
        pageVisible = !document.hidden;
        isVisible = inViewport && pageVisible;
      });

      // Respond dynamically to prefers-reduced-motion changes (WCAG 2.3.3)
      var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      var motionHandler = function (e) {
        if (e.matches) destroyCanvas();
        else initCanvas();
      };
      if (motionQuery.addEventListener) motionQuery.addEventListener('change', motionHandler);
      else if (motionQuery.addListener) motionQuery.addListener(motionHandler);

      // VT swap handler — single init path per swap (initCanvas self-tears-down).
      document.addEventListener('astro:after-swap', function () {
        initCanvas();
      });

      initCanvas(); // first load
    }
```

(Remove the old unconditional `initCanvas();` that was after this block. Steps 11–13 already inlined the new mouse/touch/resize bodies into this block; do not also leave the old duplicates above it — this block is the single source for those listeners now.)

- [ ] **Step 15: Build + lint**

Run:
```bash
npm run build && npm run lint && npm run format:check
```
Expected: all pass. Pagefind index still generated. No build errors about duplicate `id="hero-canvas"` (there is now exactly one canvas, in BaseLayout).

- [ ] **Step 16: Manual verification in dev**

Run `npm run dev` and eyeball:
- Homepage (`/`): the terrain vis fills the hero AND is visible in the gap just above the footer; cards in the middle are readable over the opaque scrim band; there is clearly more space between the last content and the footer.
- Scroll past the hero on `/` and `/blog/`: the vis **keeps animating** (the old IntersectionObserver would have frozen it) and mouse-reactive animations (terrain gravity, flow vortex) still respond to the pointer at the bottom of the page.
- A short page (`/privacy/` or `/colophon/`): content is readable (the transparent bottom band sits at the bottom of `<main>` = the gap above the footer, not stretched across the whole page — element-relative `%` stops working).
- A **long page scrolled to the very bottom** (e.g. `/blog/` or a long post): the vis **is visible in the gap between the last content and the footer** (element-relative band binds to the bottom of `<main>`, so the opaque footer doesn't cover it).
- Open a second tab and switch away: the vis pauses (tab-visibility). Switch back: it resumes.
- Toggle `prefers-reduced-motion` in devtools (Rendering → Emulate): the canvas disappears; the page still reads correctly (scrim is opaque, footer opaque).
- Light mode (`t`): scrim is cream (`--color-surface` light value); cards/text keep WCAG AA.

- [ ] **Step 17: Commit**

```bash
git add src/layouts/BaseLayout.astro src/styles/global.css src/components/Footer.astro src/components/HeroCanvas.astro
git commit -m "feat(vis): body-level fixed HeroCanvas + element-relative main scrim + footer spacing

- HeroCanvas becomes a controller-only script; canvas lives in BaseLayout at body level
- main gets an element-relative (% stops) scrim: transparent hero + bottom gap above footer, opaque middle
- remove IntersectionObserver (fixed canvas always in view); viewport-relative pointer/sizing
- single-init lifecycle (teardown-then-setup per VT swap)
- footer bg opaque so vis shows in the gap above, not through it; pb-[240px] on main"
```

---

## Task 2: Migrate the 16 pages to `heroAnimation` prop + remove dead `<HeroCanvas>` calls

After Task 1, the 16 pages still render `<HeroCanvas animation="…"/>` (which now emits no markup) and don't pass `heroAnimation`, so every page auto-rotates. This task restores the correct fixed animation per page and removes the now-dead calls/imports.

**Files (all 16):**
- `src/pages/index.astro` — `terrain`
- `src/pages/404.astro` — `entropy`
- `src/pages/privacy.astro` — `cipher`
- `src/pages/about.astro` — `strata`
- `src/pages/services.astro` — `pulse`
- `src/pages/search.astro` — `radar` (also edited in Task 4; here just the prop + HeroCanvas removal)
- `src/pages/colophon.astro` — `loom`
- `src/pages/contact.astro` — `signal`
- `src/pages/now.astro` — `orbit`
- `src/pages/activity/index.astro` — `dataflow`
- `src/pages/gallery/index.astro` — `flow`
- `src/pages/projects/index.astro` — `blueprint`
- `src/pages/blog/[...page].astro` — `ink` (also edited in Task 9; here just the prop + HeroCanvas removal)
- `src/pages/audio/[...page].astro` — `soundwave`
- `src/pages/new/index.astro` — `crystallise`
- `src/pages/analytics/index.astro` — `stream`

**Interfaces:**
- Consumes: `<BaseLayout heroAnimation="…">` from Task 1.

- [ ] **Step 1: For each of the 16 pages, make two edits**

(a) Add `heroAnimation="<name>"` to the `<BaseLayout …>` opening tag. Example for `src/pages/index.astro`:

```astro
<BaseLayout
  title="Adrian Wedd"
  description="…"
  heroAnimation="terrain"
>
```

Place it as the last prop before the closing `>`. For pages whose `<BaseLayout>` is a single line, add it on that line.

(b) Remove the `<HeroCanvas animation="<name>" />` line from inside the hero `<section>`, and remove the now-unused `import HeroCanvas from '…components/HeroCanvas.astro';` line at the top of the file.

The exact `<HeroCanvas animation="…"/>` line per file (verify against `grep -n "<HeroCanvas animation=" src/pages`):

| File | animation |
|---|---|
| `src/pages/index.astro:95` | `terrain` |
| `src/pages/404.astro:34` | `entropy` |
| `src/pages/privacy.astro:12` | `cipher` |
| `src/pages/about.astro:55` | `strata` |
| `src/pages/services.astro:207` | `pulse` |
| `src/pages/search.astro:12` | `radar` |
| `src/pages/colophon.astro:81` | `loom` |
| `src/pages/contact.astro:23` | `signal` |
| `src/pages/now.astro:22` | `orbit` |
| `src/pages/activity/index.astro:18` | `dataflow` |
| `src/pages/gallery/index.astro:29` | `flow` |
| `src/pages/projects/index.astro:95` | `blueprint` |
| `src/pages/blog/[...page].astro:64` | `ink` |
| `src/pages/audio/[...page].astro:49` | `soundwave` |
| `src/pages/new/index.astro:81` | `crystallise` |
| `src/pages/analytics/index.astro:17` | `stream` |

The hero `<section>` keeps its `min-h-[100dvh]`/`50dvh`, `relative`, `z-10` text, and (where present) `hero-glow` class — it now sits transparently over the fixed body-level canvas.

- [ ] **Step 2: Build + lint + internal links**

Run:
```bash
npm run build && npm run lint && npm run format:check && npm run check:links
```
Expected: all pass. No page should still import `HeroCanvas` (verify with `grep -rn "HeroCanvas" src/pages` returning nothing).

- [ ] **Step 3: Manual verification in dev**

Run `npm run dev` and confirm each page shows its **fixed** animation (not auto-rotate): `/` → terrain, `/about/` → strata, `/blog/` → ink, `/search/` → radar, `/projects/` → blueprint, `/gallery/` → flow, `/audio/` → soundwave, `/now/` → orbit, `/contact/` → signal, `/services/` → pulse, `/colophon/` → loom, `/404.html` → entropy, `/activity/` → dataflow, `/new/` → crystallise, `/analytics/` → stream. Confirm no page renders a second canvas (no duplicate-id paint artefacts).

- [ ] **Step 4: Commit**

```bash
git add -u src/pages
git commit -m "feat(vis): pass heroAnimation prop on all 16 pages; drop dead <HeroCanvas> calls"
```

---

## Task 3: Homepage `SearchAction` schema — `?q=` → `?s=`

**Files:**
- Modify: `src/pages/index.astro` (the `urlTemplate` line in the WebSite JSON-LD)

**Interfaces:**
- Produces: the homepage advertises `https://adrianwedd.com/search/?s={search_term_string}` so Google sitelinks search produces `?s=` URLs (which the BaseLayout redirect from Task 1 step 2 and the `/search/` script from Task 4 both handle). Old `?q=` bookmarks keep working because `/search/` reads `q` as fallback and the redirect only fires off-`/search/`.

- [ ] **Step 1: Change the `urlTemplate`**

In `src/pages/index.astro`, in the `set:html={JSON.stringify({ … potentialAction … })}` block, change the `urlTemplate` value from `https://adrianwedd.com/search/?q={search_term_string}` to `https://adrianwedd.com/search/?s={search_term_string}`:

```js
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://adrianwedd.com/search/?s={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
```

- [ ] **Step 2: Build + verify the schema**

Run:
```bash
npm run build && npm run lint && npm run format:check
```
Expected: pass. Then `grep -n "search/?s=" dist/index.html` should show the updated `urlTemplate`; `grep -c "search/?q=" dist/index.html` should return `0`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(search): homepage SearchAction advertises ?s= (was ?q=)"
```

---

## Task 4: `/search/` — compact header, `s || q`, guarded autofocus

**Files:**
- Modify: `src/pages/search.astro` (hero section, the inline script's `mountUI`)

**Interfaces:**
- Consumes: the BaseLayout `?s=` redirect (Task 1 step 2) sends `/?s=term` visitors here as `/search/?s=term`.
- Produces: `/search/?s=term` and `/search/?q=term` both pre-fill + run the search; autofocus fires only on entry navigation (not back/forward), only when nothing is meaningfully focused.

- [ ] **Step 1: Compact the header**

In `src/pages/search.astro`, change the hero `<section>` opening class from `min-h-[50dvh]` to `min-h-[28dvh]` so the search box sits near the top of the page. (The `radar` `HeroCanvas` is now rendered via the `heroAnimation` prop added in Task 2 — confirm `heroAnimation="radar"` is on the `<BaseLayout>` and there is no `<HeroCanvas animation="radar" />` line left in the section.)

```astro
<section class="relative flex min-h-[28dvh] items-center px-4 sm:px-6 lg:px-8">
  <div class="relative z-10 mx-auto max-w-3xl">
    <h1 class="text-text">Search</h1>
    <p class="mt-2 text-text-muted">Find anything across the site.</p>
  </div>
</section>
```

- [ ] **Step 2: Read `s || q` and guard the autofocus (VT-aware)**

Three edits to the inline `<script is:inline>` in `src/pages/search.astro`.

**(a)** Add a module-level `lastNavType` var at the top of the IIFE (right after `(function () {`). The Navigation API updates this per-navigation; `mountUI` reads it. Default `'navigate'` so the very first load (whose `navigate` event fires before this script can register a listener) is treated as an entry, not a traversal:

```js
  (function () {
    var lastNavType = 'navigate';
```

**(b)** Replace the `mountUI` function's deep-link block (the `var q = …; if (q && …) ui.triggerSearch(q);` lines) with the `s || q` read plus a guarded autofocus. The guard suppresses autofocus on **both** kinds of back/forward: the Navigation API signals VT-swap traversals (`navigationType === 'traverse'`), and the performance navigation entry signals full-load back/forward (`type === 'back_forward'`). Either → suppress. This matters because under Astro's ClientRouter (VT on by default) `performance.getEntriesByType('navigation')[0]` is the *initial* full-load entry and goes stale across VT swaps, so it alone would miss VT back/forward. It also defers until the Pagefind input exists and uses `{ preventScroll: true }`:

```js
      function mountUI() {
        var ui = new PagefindUI({
          element: '#search',
          showSubResults: true,
          showImages: true,
          translations: {
            zero_results:
              "No matches for [SEARCH_TERM]. Try a broader term, a different spelling, or browse the blog, projects, and gallery from the menu.",
          },
        });
        var sk = document.getElementById('search-skeleton');
        if (sk) sk.remove();
        // Deep-link support: canonical param is s (homepage SearchAction), q is a fallback
        // for old bookmarks. /?s=term is redirected here by BaseLayout.
        var params = new URLSearchParams(window.location.search);
        var term = params.get('s') || params.get('q');
        if (term && typeof ui.triggerSearch === 'function') ui.triggerSearch(term);

        // Guarded autofocus: only on entry navigation (not back/forward), only when no
        // element is meaningfully focused, deferred until the Pagefind input exists.
        // Two back/forward signals, OR'd: Navigation API 'traverse' (covers VT swaps,
        // where the performance entry is stale) + performance entry 'back_forward'
        // (covers full-load back/forward in browsers without the Navigation API).
        var perfNav = (performance && performance.getEntriesByType) ? performance.getEntriesByType('navigation')[0] : null;
        var perfBack = !!(perfNav && perfNav.type === 'back_forward');
        var hasNavApi = typeof navigation !== 'undefined' && typeof navigation.addEventListener === 'function';
        var navApiBack = hasNavApi && lastNavType === 'traverse';
        var isEntry = !perfBack && !navApiBack;
        var ae = document.activeElement;
        var hasFocus = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT' || ae.isContentEditable);
        if (isEntry && !hasFocus) {
          var tries = 0;
          (function focusInput() {
            var el = document.querySelector('.pagefind-ui__search-input');
            if (el) { el.focus({ preventScroll: true }); return; }
            if (++tries < 50) setTimeout(focusInput, 20);
          })();
        }
      }
```

**(c)** Inside the existing sentinel block (`if (!document.documentElement.dataset.pagefindListenerInit) { … }`), after the `astro:page-load` registration, register the Navigation API `navigate` listener once so `lastNavType` tracks every navigation (link nav = `push`, redirect = `replace`, reload = `reload`, back/forward = `traverse`). The `if` guard makes it a no-op in browsers without the Navigation API (then `mountUI` falls back to the performance entry alone):

```js
      if (!document.documentElement.dataset.pagefindListenerInit) {
        document.documentElement.dataset.pagefindListenerInit = '1';
        document.addEventListener('astro:page-load', initPagefind);

        // Track navigation type across VT swaps (Navigation API). back/forward = 'traverse'.
        if (typeof navigation !== 'undefined' && typeof navigation.addEventListener === 'function') {
          navigation.addEventListener('navigate', function (e) {
            lastNavType = e.navigationType || 'navigate';
          });
        }
      }
```

Leave the rest of the script (`initPagefind`, the `initPagefind()` call) unchanged.

- [ ] **Step 3: Build + lint**

Run:
```bash
npm run build && npm run lint && npm run format:check
```
Expected: pass.

- [ ] **Step 4: Manual verification in dev**

Run `npm run dev` and check:
- `/search/?s=make+search+work+like+this` runs the search and focuses the input (no scroll jump).
- `/search/?q=old+bookmark` also runs the search (fallback works).
- `/?s=make+search+work+like+this` redirects to `/search/?s=make+search+work+like+this` and runs the search (full load, `location.replace` — history not cluttered).
- Navigate to `/search/` from another page via the `/` keyboard shortcut, then press browser Back: the input does **not** steal focus from where you were. Confirm this holds for a **VT back/forward** (default — Astro ClientRouter on): click into `/search/` from `/`, click through to a post, press Back to `/search/` — the search input must not steal focus (the Navigation API `traverse` guard fires). Also confirm a **full-load back/forward** (disable View Transitions via devtools or a hard Back that reloads) still suppresses (the performance `back_forward` guard fires).
- The header is compact (search box near the top, not buried under a 50dvh hero).

- [ ] **Step 5: Commit**

```bash
git add src/pages/search.astro
git commit -m "feat(search): compact header, read s||q, guarded autofocus on entry nav"
```

---

## Task 5: `Pagination` — add a `numbers` prop

**Files:**
- Modify: `src/components/Pagination.astro`

**Interfaces:**
- Produces: `<Pagination … numbers={false} />` renders only the prev/next pair (no numbered window). Consumed by Tasks 8 and 9 for pages 2+.

- [ ] **Step 1: Add the prop and gate the numbered window**

In `src/components/Pagination.astro`, add `numbers?: boolean` to the Props interface and destructure it with a `true` default:

```astro
interface Props {
  currentPage: number;
  lastPage: number;
  prevUrl?: string;
  nextUrl?: string;
  basePath: string;
  numbers?: boolean;
}

const { currentPage, lastPage, prevUrl, nextUrl, basePath, numbers = true } = Astro.props;
```

Then wrap the numbered `items.map(…)` block (the `{items.map((n) => …)}` JSX) in a `{numbers && (…)}` guard so it is suppressed when `numbers={false}`. Leave the prev/next links untouched. The nav body becomes:

```astro
{
  lastPage > 1 && (
    <nav aria-label="Pagination" class="mt-12 flex flex-wrap items-center justify-center gap-1.5">
      {prevUrl ? (
        <a href={prevUrl} rel="prev" class={linkClass}>
          ← Prev
        </a>
      ) : (
        <span aria-disabled="true" class={disabledClass}>
          ← Prev
        </span>
      )}

      {numbers &&
        items.map((n) =>
          n === 0 ? (
            <span class="px-2 py-1 text-xs text-text-muted">…</span>
          ) : n === currentPage ? (
            <a href={hrefFor(n)} aria-current="page" class={currentClass}>
              {n}
            </a>
          ) : (
            <a href={hrefFor(n)} class={linkClass}>
              {n}
            </a>
          ),
        )}

      {nextUrl ? (
        <a href={nextUrl} rel="next" class={linkClass}>
          Next →
        </a>
      ) : (
        <span aria-disabled="true" class={disabledClass}>
          Next →
        </span>
      )}
    </nav>
  )
}
```

- [ ] **Step 2: Build + lint**

Run:
```bash
npm run build && npm run lint && npm run format:check
```
Expected: pass (existing callers pass no `numbers` prop → default `true` → unchanged numbered window).

- [ ] **Step 3: Commit**

```bash
git add src/components/Pagination.astro
git commit -m "feat(pagination): add numbers prop to suppress numbered window (for pages 2+)"
```

---

## Task 6: `ScrollReveal` — expose the observer for appended content

Without this, infinite-scrolled blog articles (which are wrapped in `<ScrollReveal>` → `.scroll-reveal` → `opacity:0`) stay invisible forever, because the private `IntersectionObserver` only scans on initial load + `astro:after-swap`.

**Files:**
- Modify: `src/components/ScrollReveal.astro`

**Interfaces:**
- Produces: a `document` listener for the `adrianwedd:content-appended` `CustomEvent` (with `detail.nodes: Node[]`). The infinite-scroll fetcher in Task 7 dispatches this after appending fetched posts.

- [ ] **Step 1: Add the `content-appended` listener inside the sentinel guard**

In `src/components/ScrollReveal.astro`, register the listener once inside the existing `if (!root.dataset.scrollRevealInit)` block, after the `astro:after-swap` registration. The listener observes any `.scroll-reveal:not(.revealed)` elements among the appended nodes (both nodes that are themselves `.scroll-reveal` and descendants that are):

```js
    initScrollReveal();
    var root = document.documentElement;
    if (!root.dataset.scrollRevealInit) {
      root.dataset.scrollRevealInit = '1';
      document.addEventListener('astro:after-swap', initScrollReveal);

      // Reveal dynamically appended nodes (infinite scroll). Registered once.
      document.addEventListener('adrianwedd:content-appended', function (e) {
        var nodes = (e && e.detail && e.detail.nodes) || [];
        Array.prototype.forEach.call(nodes, function (n) {
          if (!n || !n.querySelectorAll) return;
          n.querySelectorAll('.scroll-reveal:not(.revealed)').forEach(function (el) {
            observer.observe(el);
          });
          if (n.classList && n.classList.contains('scroll-reveal') && !n.classList.contains('revealed')) {
            observer.observe(n);
          }
        });
      });
    }
```

`observer` is the module-level `var observer` already declared at the top of the IIFE; `initScrollReveal` sets it on every init, so it is current when the listener fires.

- [ ] **Step 2: Build + lint**

Run:
```bash
npm run build && npm run lint && npm run format:check
```
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/ScrollReveal.astro
git commit -m "feat(scroll-reveal): observe nodes appended via adrianwedd:content-appended"
```

---

## Task 7: `InfiniteScroll` component — "Older posts" link + VT-safe IO fetcher

**Files:**
- Create: `src/components/InfiniteScroll.astro`

**Interfaces:**
- Consumes: `data-post-list` / `data-post-item` selectors (added in Tasks 8 and 9) on the fetched paginated pages; `a[rel="next"]` on the fetched page (rendered by `Pagination`) to chain to the next page; the `adrianwedd:content-appended` event from `ScrollReveal` (Task 6).
- Produces: a visible `<a rel="next" data-older-link data-next-url="…">Older posts →</a>` that is the no-JS fallback AND the JS-disabled fallback if IO/fetch fails. The IO fetcher pre-fetches the next page when the link nears the viewport, appends `[data-post-list] > [data-post-item]` to the current list, dispatches `adrianwedd:content-appended`, and re-arms against the fetched page's `a[rel="next"]`. **No `history.pushState`** (would break the ClientRouter).

- [ ] **Step 1: Create the component**

Create `src/components/InfiniteScroll.astro` with the link markup + the VT-safe inline fetcher:

```astro
---
/**
 * InfiniteScroll — progressive-enhancement "Older posts" link.
 *
 * Props:
 *   nextUrl: string | undefined — href for page 2 (undefined when there is
 *     no next page → renders nothing).
 *   label?: string — link text (default "Older posts").
 *
 * The <a> is a plain link, so it works with JS disabled and as a fallback if the
 * IntersectionObserver / fetch fails. When JS is on, an IO pre-fetches the next
 * page when the link nears the viewport, appends the fetched [data-post-item]
 * nodes to the page-1 [data-post-list], and re-arms against the fetched page's
 * a[rel="next"]. No history.pushState — that breaks the Astro ClientRouter.
 */
interface Props {
  nextUrl?: string;
  label?: string;
}
const { nextUrl, label = 'Older posts' } = Astro.props;
---

{
  nextUrl && (
    <a
      href={nextUrl}
      rel="next"
      data-older-link
      data-next-url={nextUrl}
      class="mt-12 inline-block rounded-full bg-surface-raised px-5 py-2 text-sm text-text-muted no-underline transition-colors hover:text-accent"
    >
      {label} →
    </a>
  )
}

<script is:inline>
  (function () {
    var root = document.documentElement;

    function arm(link) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            io.disconnect();
            loadMore(link);
          });
        },
        { rootMargin: '600px 0px' },
      );
      io.observe(link);
    }

    function loadMore(link) {
      var url = link.dataset.nextUrl;
      if (!url) {
        link.style.display = 'none';
        return;
      }
      var myGen = root.dataset.infiniteScrollGen || '0';
      fetch(url, { headers: { Accept: 'text/html' } })
        .then(function (r) {
          return r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status));
        })
        .then(function (html) {
          // Drop the result if a VT swap happened mid-fetch.
          if ((root.dataset.infiniteScrollGen || '0') !== myGen) return;
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var list = document.querySelector('[data-post-list]');
          if (!list) return;
          var items = doc.querySelectorAll('[data-post-list] > [data-post-item]');
          var frag = document.createDocumentFragment();
          var nodes = [];
          Array.prototype.forEach.call(items, function (item) {
            var node = document.importNode(item, true);
            frag.appendChild(node);
            nodes.push(node);
          });
          list.appendChild(frag);
          // Reveal appended nodes (ScrollReveal-wrapped blog articles are opacity:0).
          document.dispatchEvent(
            new CustomEvent('adrianwedd:content-appended', { detail: { nodes: nodes } }),
          );
          // Chain to the next page via the fetched page's a[rel="next"].
          var nextA = doc.querySelector('a[rel="next"]');
          if (nextA && nextA.getAttribute('href')) {
            var nh = nextA.getAttribute('href');
            link.setAttribute('href', nh);
            link.dataset.nextUrl = nh;
            arm(link);
          } else {
            link.style.display = 'none';
          }
        })
        .catch(function () {
          // Leave the plain link visible as a fallback navigation to the next page.
        });
    }

    function init() {
      var link = document.querySelector('[data-older-link]');
      if (!link) return;
      if (!link.dataset.nextUrl) {
        link.style.display = 'none';
        return;
      }
      arm(link);
    }

    if (!root.dataset.infiniteScrollInit) {
      root.dataset.infiniteScrollInit = '1';
      root.dataset.infiniteScrollGen = '0';
      document.addEventListener('astro:after-swap', function () {
        root.dataset.infiniteScrollGen = String(
          (parseInt(root.dataset.infiniteScrollGen || '0', 10) + 1),
        );
        init();
      });
      init();
    }
  })();
</script>
```

- [ ] **Step 2: Build + lint**

Run:
```bash
npm run build && npm run lint && npm run format:check
```
Expected: pass (component unused until Tasks 8/9 wire it in).

- [ ] **Step 3: Commit**

```bash
git add src/components/InfiniteScroll.astro
git commit -m "feat(infinite-scroll): InfiniteScroll component (visible Older-posts link + IO fetcher)"
```

---

## Task 8: Blog index — `data-post-list`/`data-post-item` + infinite scroll on page 1

**Files:**
- Modify: `src/pages/blog/[...page].astro`

**Interfaces:**
- Consumes: `<InfiniteScroll nextUrl={…}>` (Task 7), `<Pagination … numbers={false}>` (Task 5), `data-post-list`/`data-post-item` selectors (consumed by the InfiniteScroll fetcher).

- [ ] **Step 1: Add the stable selectors**

In `src/pages/blog/[...page].astro`, add `data-post-list` to the post-list `<div>` and `data-post-item` to each `<article>`. The list div opening tag (currently `<div class="mt-10 space-y-8">`):

```astro
<div class="mt-10 space-y-8" data-post-list>
```

The `<article>` inside the `.map` (currently `<article>`):

```astro
<article data-post-item>
```

- [ ] **Step 2: Page 1 → `InfiniteScroll`; pages 2+ → `Pagination numbers={false}`**

In `src/pages/blog/[...page].astro`, replace the existing `<Pagination … />` block (after the post-list `</div>`) with a branch on `isFirst`. Page 1 uses `InfiniteScroll` (the `nextUrl` is `/blog/2/` when there is a page 2, else `undefined` → renders nothing). Pages 2+ use `Pagination` with `numbers={false}` so direct visitors / no-JS users get a stripped "Prev / Next" pair without the numbered window:

```astro
{
  isFirst ? (
    <InfiniteScroll nextUrl={nextUrl} />
  ) : (
    <Pagination
      currentPage={page.currentPage}
      lastPage={page.lastPage}
      prevUrl={prevUrl}
      nextUrl={nextUrl}
      basePath="/blog/"
      numbers={false}
    />
  )
}
```

Add the `InfiniteScroll` import at the top of the frontmatter (next to the `Pagination` import):

```astro
import InfiniteScroll from '../../components/InfiniteScroll.astro';
```

(`HeroCanvas` import + `<HeroCanvas animation="ink" />` line were already removed in Task 2; if Task 2 left them, remove them here and ensure `heroAnimation="ink"` is on the `<BaseLayout>`.)

- [ ] **Step 3: Build + lint + internal links**

Run:
```bash
npm run build && npm run lint && npm run format:check && npm run check:links
```
Expected: pass. The paginated routes `/blog/2/`, `/blog/3/`, … still exist (check `ls dist/blog` shows the numbered dirs). `npm run check:links` passes (no URLs added/removed).

- [ ] **Step 4: Manual verification in dev**

Run `npm run dev` and check `/blog/`:
- The numbered pagination is gone on page 1; a visible "Older posts →" link sits below the post list.
- Scroll near the link: page 2 posts fetch + append into the list; appended blog posts **fade in** (ScrollReveal reveals them via `adrianwedd:content-appended`); the "Older posts" link updates to point to `/blog/3/` (or hides after the last page).
- The URL stays at `/blog/` (no `pushState`).
- Press browser Back from a post detail page back to `/blog/`: returns cleanly (no VT breakage).
- Disable JS (devtools → Settings → Disable JavaScript) and reload `/blog/`: the "Older posts →" link is a plain link to `/blog/2/` and navigates normally.
- Visit `/blog/2/` directly: shows a stripped "Prev / Next" pair (no numbered window), and the posts are readable.

- [ ] **Step 5: Commit**

```bash
git add src/pages/blog/[...page].astro
git commit -m "feat(blog): infinite scroll on page 1 (visible Older-posts link + IO fetcher); stripped pagination on pages 2+"
```

---

## Task 9: Tag index — `data-post-list`/`data-post-item` + infinite scroll on page 1

**Files:**
- Modify: `src/pages/blog/tag/[tag]/[...page].astro`

**Interfaces:**
- Consumes: same as Task 8, parameterised by `basePath = /blog/tag/${tag}/`.

- [ ] **Step 1: Add the stable selectors**

In `src/pages/blog/tag/[tag]/[...page].astro`, add `data-post-list` to the post-list `<div>` (currently `<div class="mt-10 space-y-8">`) and `data-post-item` to each `<article>` (currently `<article>`):

```astro
<div class="mt-10 space-y-8" data-post-list>
```

```astro
<article data-post-item>
```

- [ ] **Step 2: Page 1 → `InfiniteScroll`; pages 2+ → `Pagination numbers={false}`**

In `src/pages/blog/tag/[tag]/[...page].astro`, replace the existing `<Pagination … />` block (after the post-list `</div>`) with:

```astro
{
  isFirst ? (
    <InfiniteScroll nextUrl={nextUrl} />
  ) : (
    <Pagination
      currentPage={page.currentPage}
      lastPage={page.lastPage}
      prevUrl={prevUrl}
      nextUrl={nextUrl}
      basePath={basePath}
      numbers={false}
    />
  )
}
```

Add the import at the top of the frontmatter:

```astro
import InfiniteScroll from '../../../../components/InfiniteScroll.astro';
```

- [ ] **Step 3: Build + lint + internal links**

Run:
```bash
npm run build && npm run lint && npm run format:check && npm run check:links
```
Expected: pass. Tag paginated routes (`/blog/tag/{tag}/2/`, …) still exist.

- [ ] **Step 4: Manual verification in dev**

Run `npm run dev` and pick a tag with > 12 posts (e.g. `/blog/tag/ai/`):
- Numbered pagination gone on page 1; visible "Older posts →" link.
- Scroll near it: page 2 tag posts append; tag articles are **not** wrapped in `ScrollReveal`, so they appear immediately (no fade — expected; the asymmetry is noted in the spec).
- URL stays at `/blog/tag/ai/`. Back button returns cleanly.
- JS-disabled: the plain link navigates to `/blog/tag/ai/2/`.
- `/blog/tag/ai/2/` directly: stripped "Prev / Next" pair, no numbered window.

- [ ] **Step 5: Commit**

```bash
git add src/pages/blog/tag/[tag]/[...page].astro
git commit -m "feat(blog): infinite scroll on tag page 1; stripped pagination on tag pages 2+"
```

---

## Task 10: Full verification + CI gates

**Files:** none (verification only).

- [ ] **Step 1: Run every CI gate locally**

```bash
npm run build && npm run lint && npm run format:check && node scripts/validate-content.js && npm run check:links
```
Expected: all pass. `dist/_astro/` size within budget (the build-size gate in `deploy.yml` warns at 100MB / 150KB JS chunks — the always-on canvas is roughly the same GPU cost as before, no new JS bundle of substance).

- [ ] **Step 2: Lighthouse**

```bash
npm run build && npm run lighthouse
```
Expected: CLS within budget (the fixed canvas + viewport-fixed scrim shouldn't shift content — the canvas is `position: fixed` and the scrim is a background, neither affects layout). No perf regression vs. the pre-change baseline (the canvas was already near-viewport-sized; the always-on loop is gated by tab-visibility + reduced-motion).

- [ ] **Step 3: Browser manual — full matrix**

Run `npm run dev` and confirm each of these:
- `/search/?s=make+search+work+like+this` runs the search + focuses the input (guard honoured, no scroll jump).
- `/?s=make+search+work+like+this` redirects to `/search/?s=…` and runs it.
- `/search/?q=old+bookmark` runs the search (fallback).
- `/blog/` scrolls to load pages 2, 3, …; URL stays at `/blog/`; appended posts fade in; back button returns cleanly.
- `/blog/tag/{tag}/` (multi-page tag) scrolls to load more; URL stays; back clean.
- Vis visible in the gap above the footer on a long page (`/blog/`, `/about/`) and a short page (`/privacy/`, `/colophon/`).
- Mouse-reactive animations (terrain on `/`, flow on `/gallery/`) still respond at the bottom of the page after scrolling past the hero.
- `prefers-reduced-motion` emulated in devtools: canvas hidden, page readable.
- Light mode (`t`): scrim cream, WCAG AA preserved, footer opaque.
- JS disabled on `/blog/`: "Older posts →" plain link to `/blog/2/` works.
- `/blog/2/` and `/blog/tag/{tag}/2/` directly: stripped Prev/Next pair (no numbered window).

- [ ] **Step 4: No leftover dead references**

```bash
grep -rn "HeroCanvas" src/pages
grep -rn "hero-canvas-wrap\|hero-canvas-overlay" src
grep -rn "search/?q=" src/pages/index.astro
```
Expected: the first two return nothing; the third returns nothing.

- [ ] **Step 5: No commit (verification only)**

If everything passes, the branch is ready for PR. Do not commit in this task.

---

## Self-Review

**1. Spec coverage** — checked against each spec section:
- Workstream 1 (full-viewport vis): Task 1 (body-level canvas, scrim, IO removal, viewport pointer, single-init, overlay removal, stale class mutations removed, footer spacing) + Task 2 (16 pages pass prop) + footer spacing (Task 1 step 1 `pb-[240px]` + Step 5 opaque footer). ✓
- Workstream 2 (search): `?s=` redirect (Task 1 step 2) + `/search/` `s||q` + compact header + guarded autofocus (Task 4) + homepage SearchAction `?q→?s` (Task 3). ✓
- Workstream 3 (infinite scroll): stable selectors (Tasks 8/9) + visible "Older posts" fallback + IO fetcher (Task 7) + no `pushState` (Task 7, no `pushState`/`replaceState` in the code) + pages-2+ stripped pagination (Task 5 prop, consumed in Tasks 8/9) + ScrollReveal exposure (Task 6) + VT-swap-mid-fetch guard (Task 7 gen check) + tag pages identical treatment (Task 9). ✓
- Workstream 4 (footer spacing): folded into Task 1 (`pb-[240px]` + element-relative transparent bottom scrim band + opaque footer). ✓
- Critical-three from QA: canvas at body level (Task 1 step 1) ✓; IntersectionObserver removed so the loop doesn't freeze when scrolling past the hero (Task 1 steps 8–9) ✓; ScrollReveal's private observer exposed via `adrianwedd:content-appended` (Task 6) ✓.
- Round-2 QA fixes: canvas `z-index: -1` so the non-positioned footer paints above it (Task 1 step 3) ✓; `.hero-canvas-bg` + `main` scrim placed in `@layer utilities` per project convention (Task 1 step 3) ✓; dead `.hero-canvas-wrap`/`.hero-canvas-overlay` selectors removed so the Task 10 grep is clean (Task 1 step 4) ✓; `@media print` clears `main`'s gradient so dark-mode print stays readable (Task 1 step 4c) ✓; `?s=` redirect carries `data-astro-rerun` so it fires on VT swaps to `/?s=term` (Task 1 step 2) ✓; autofocus guard is VT-aware — Navigation API `traverse` OR performance `back_forward` (Task 4 step 2) ✓.

**2. Placeholder scan** — no "TBD", "add error handling", "similar to Task N", or undescribed steps. Every code step shows the actual code. The 16-page migration table (Task 3 — note: this is the plan's Task 2) gives the exact animation per file rather than saying "do the same as index.astro".

**3. Type/name consistency** — `heroAnimation` prop (Task 1) ↔ `props.heroAnimation` (Task 2) ↔ `document.body.dataset.heroAnimation` (Task 1 step 8) — consistent. `data-post-list` / `data-post-item` (Tasks 8/9) ↔ `InfiniteScroll` queries (Task 7) — consistent. `adrianwedd:content-appended` with `detail.nodes` (Task 6) ↔ dispatch (Task 7) — consistent. `numbers` prop (Task 5) ↔ `numbers={false}` (Tasks 8/9) — consistent. `nextUrl` (Task 7 Props) ↔ `nextUrl={nextUrl}` (Tasks 8/9) — consistent. `switchAnimation(index, canvas, ctx)` (Task 1 step 10) ↔ call site `switchAnimation(nextIdx, c, x)` (Task 1 step 8) — consistent.

No issues found; no tasks added.