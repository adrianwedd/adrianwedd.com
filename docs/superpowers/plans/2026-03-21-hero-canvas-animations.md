# Hero Canvas Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 organic-technical canvas animations behind the homepage hero with a pill switcher, themed to botanical/systems identity.

**Architecture:** Single new Astro component (`HeroCanvas.astro`) containing canvas element, readability overlay, switcher HTML, and all animation logic in one `<script is:inline>`. Integrated into `index.astro` hero section. Canvas renders behind existing content via absolute positioning. VT-safe via sentinel + event delegation pattern matching existing carousel.

**Tech Stack:** Astro 5, Canvas 2D API, CSS custom properties, inline simplex noise. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-03-21-hero-canvas-animations-design.md`

---

### Task 1: Prerequisite — Scope Carousel Keyboard Handler

**Files:**
- Modify: `src/pages/index.astro:308-312`

The carousel's ArrowLeft/ArrowRight listener fires globally, which will conflict with the animation switcher's keyboard navigation. Scope it to only fire when the carousel element or a descendant has focus.

- [ ] **Step 1: Modify the carousel keyboard handler**

In the carousel `<script is:inline>` block (~line 308), change the keydown handler from:

```javascript
document.addEventListener('keydown', function (e) {
  if (!document.getElementById('hero-carousel')) return;
  if (e.key === 'ArrowLeft') { stopAutoplay(); goToSlide(currentSlide - 1); startAutoplay(); }
  if (e.key === 'ArrowRight') { stopAutoplay(); goToSlide(currentSlide + 1); startAutoplay(); }
});
```

To:

```javascript
document.addEventListener('keydown', function (e) {
  var carousel = document.getElementById('hero-carousel');
  if (!carousel) return;
  if (!carousel.contains(document.activeElement) && document.activeElement !== carousel) return;
  if (e.key === 'ArrowLeft') { stopAutoplay(); goToSlide(currentSlide - 1); startAutoplay(); }
  if (e.key === 'ArrowRight') { stopAutoplay(); goToSlide(currentSlide + 1); startAutoplay(); }
});
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "fix: scope carousel keyboard handler to focus context

Prevents arrow key conflicts with other interactive components by only
responding to ArrowLeft/ArrowRight when the carousel or a child has focus."
```

---

### Task 2: Add scrollbar-hide Utility

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add scrollbar-hide utility class**

In `src/styles/global.css`, INSIDE the `@layer utilities { }` block (after the `@media (prefers-reduced-motion: reduce) { }` block at ~line 256, but BEFORE the closing `}` of `@layer utilities` at ~line 257), add:

```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

- [ ] **Step 2: Add reduced-motion rule for hero canvas**

In the same `@layer utilities` block, inside the existing `@media (prefers-reduced-motion: reduce)` block (~line 236-256), add:

```css
.hero-canvas-wrap,
.hero-canvas-switcher {
  display: none !important;
}
```

- [ ] **Step 3: Add print hide rule for canvas**

In the existing `@media print` block (~line 270), add `#hero-canvas` to the list of hidden elements:

```css
header,
footer,
nav,
#consent-banner,
#kb-overlay,
#reading-progress,
#hero-canvas,
.hero-canvas-switcher,
.mobile-menu,
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add scrollbar-hide utility and canvas motion/print rules"
```

---

### Task 3: Create HeroCanvas.astro — Framework Shell

**Files:**
- Create: `src/components/HeroCanvas.astro`

This task creates the complete component shell: canvas element, readability overlay, switcher HTML, and the JS framework (init/destroy lifecycle, resize, theme observer, IntersectionObserver, animation switching, VT compat). No animation implementations yet — just a placeholder that clears the canvas.

- [ ] **Step 1: Create the component file**

Create `src/components/HeroCanvas.astro` with this content.

**Important layout note:** The component outputs two sibling elements — the canvas wrapper (absolute, z-0) and the switcher (relative, z-10). The switcher must appear AFTER the hero content in DOM order so it renders at the bottom of the hero section. In Task 4, the component is split: the canvas wrapper goes first, hero content in the middle, switcher last. To support this, the component uses two named slots — but since the canvas and switcher are both part of this component, we use a simpler approach: output all elements and let the parent control layout via flexbox column.

```astro
---
// HeroCanvas.astro — generative canvas animations behind the homepage hero.
// All animation logic is in the inline script below.
// See docs/superpowers/specs/2026-03-21-hero-canvas-animations-design.md

const animations = [
  { id: 'mycelium', short: 'Myc', full: 'Mycelium' },
  { id: 'fern', short: 'Fern', full: 'Fern' },
  { id: 'flow', short: 'Flow', full: 'Flow' },
  { id: 'roots', short: 'Root', full: 'Roots' },
  { id: 'neural', short: 'Neur', full: 'Neural' },
  { id: 'terrain', short: 'Terr', full: 'Terrain' },
  { id: 'spores', short: 'Spor', full: 'Spores' },
  { id: 'erosion', short: 'Eros', full: 'Erosion' },
];
---

{/* Canvas layer — absolute positioned behind hero content */}
<div class="hero-canvas-wrap absolute inset-0 z-0">
  <canvas id="hero-canvas" class="absolute inset-0 h-full w-full" aria-hidden="true"></canvas>
  <div class="hero-canvas-overlay pointer-events-none absolute inset-0 z-[1]"
    style="background: linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--color-surface) 40%, transparent) 30%, color-mix(in srgb, var(--color-surface) 70%, transparent) 60%, var(--color-surface) 100%);"
  ></div>
</div>

{/* Switcher — rendered separately via Astro.slots, see index.astro */}
<div
  id="hero-canvas-switcher"
  class="hero-canvas-switcher relative z-10 flex justify-center gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide"
  role="tablist"
  aria-label="Background animation"
  style="-webkit-mask-image: linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent); mask-image: linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent);"
>
  {animations.map((anim, i) => (
    <button
      type="button"
      role="tab"
      class="hero-anim-tab flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors"
      data-anim={anim.id}
      data-index={i}
      aria-selected="false"
      tabindex="-1"
    >
      <span class="sm:hidden">{anim.short}</span>
      <span class="hidden sm:inline">{anim.full}</span>
    </button>
  ))}
</div>

<script is:inline>
(function () {
  // --- Shared state (persists across VT swaps within IIFE re-executions) ---
  var rafId = null;
  var intersectionObs = null;
  var themeObs = null;
  var resizePending = false;
  var currentIndex = -1;
  var isVisible = true;
  var colors = {};
  var canvasW = 0, canvasH = 0;
  var dpr = 1;
  var adaptiveQuality = 1.0;
  var fastFrameCount = 0;
  var pendingIndex = -1; // tracks animation being transitioned to

  // --- Color reading ---
  function readColors() {
    var s = getComputedStyle(document.documentElement);
    colors.accent = s.getPropertyValue('--color-accent').trim();
    colors.surface = s.getPropertyValue('--color-surface').trim();
    colors.muted = s.getPropertyValue('--color-text-muted').trim();
    colors.border = s.getPropertyValue('--color-border').trim();
  }

  // --- Canvas sizing ---
  function sizeCanvas(canvas, section) {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasW = section.clientWidth;
    canvasH = section.clientHeight;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = canvasW + 'px';
    canvas.style.height = canvasH + 'px';
  }

  // --- Animation registry (populated by subsequent tasks) ---
  var ANIMATIONS = {};
  // Each animation is { init: fn(w, h, colors), frame: fn(ctx, w, h, t, colors, quality), cleanup: fn() }
  // w/h are CSS pixels. ctx is already scaled by dpr.

  // Placeholder until real animations are added
  ANIMATIONS.placeholder = {
    init: function () {},
    frame: function (ctx, w, h) {
      ctx.clearRect(0, 0, w * dpr, h * dpr);
    },
    cleanup: function () {}
  };

  var ANIM_KEYS = ['mycelium', 'fern', 'flow', 'roots', 'neural', 'terrain', 'spores', 'erosion'];

  function getAnim(key) {
    return ANIMATIONS[key] || ANIMATIONS.placeholder;
  }

  // --- Switcher UI ---
  function updateSwitcherUI(index) {
    var tabs = document.querySelectorAll('.hero-anim-tab');
    tabs.forEach(function (tab, i) {
      var active = i === index;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
      if (active) {
        tab.classList.add('bg-accent', 'text-surface', 'border-accent');
        tab.classList.remove('text-text-muted', 'border-border', 'bg-transparent');
      } else {
        tab.classList.remove('bg-accent', 'text-surface', 'border-accent');
        tab.classList.add('text-text-muted', 'border-border', 'bg-transparent');
      }
    });
  }

  // --- Animation switching with fade ---
  function switchAnimation(index, canvas, ctx, section) {
    if (index === currentIndex || index === pendingIndex) return;
    pendingIndex = index;
    var anim = getAnim(ANIM_KEYS[currentIndex]);
    if (anim && anim.cleanup) { try { anim.cleanup(); } catch (e) { console.warn('HeroCanvas cleanup error:', e); } }

    canvas.style.willChange = 'opacity';
    canvas.style.transition = 'opacity 150ms ease';
    canvas.style.opacity = '0';

    setTimeout(function () {
      // Only proceed if this is still the pending animation (guards against rapid clicks)
      if (pendingIndex !== index) return;
      currentIndex = index;
      pendingIndex = -1;
      try { sessionStorage.setItem('adrianwedd_heroAnimation', String(index)); } catch (e) {}
      // Clear canvas between animations to prevent bleed-through
      var c = document.getElementById('hero-canvas');
      if (c) { var x = c.getContext('2d'); if (x) x.clearRect(0, 0, c.width, c.height); }
      var newAnim = getAnim(ANIM_KEYS[index]);
      try { newAnim.init(canvasW, canvasH, colors); } catch (e) { console.warn('HeroCanvas init error:', e); }
      updateSwitcherUI(index);
      canvas.style.opacity = '1';
      setTimeout(function () {
        canvas.style.willChange = '';
        canvas.style.transition = '';
      }, 160);
    }, 150);
  }

  // --- Render loop ---
  function startLoop(canvas, ctx) {
    var lastTime = 0;
    function loop(timestamp) {
      rafId = requestAnimationFrame(loop);
      if (!isVisible) return;
      // Discard first frame (lastTime is 0, dt would be huge)
      if (lastTime === 0) { lastTime = timestamp; return; }
      var dt = timestamp - lastTime;
      lastTime = timestamp;

      // Adaptive quality
      if (dt > 20) {
        adaptiveQuality = Math.max(0.25, adaptiveQuality * 0.8);
        fastFrameCount = 0;
      } else if (dt < 10) {
        fastFrameCount++;
        if (fastFrameCount >= 10) {
          adaptiveQuality = Math.min(1.0, adaptiveQuality * 1.1);
          fastFrameCount = 0;
        }
      } else {
        fastFrameCount = 0;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      var anim = getAnim(ANIM_KEYS[currentIndex]);
      try {
        anim.frame(ctx, canvasW, canvasH, timestamp, colors, adaptiveQuality);
      } catch (e) {
        console.warn('HeroCanvas frame error on ' + ANIM_KEYS[currentIndex] + ':', e);
        // Skip to next animation on error
        var nextIdx = (currentIndex + 1) % ANIM_KEYS.length;
        switchAnimation(nextIdx, canvas, ctx, canvas.closest('section'));
      }
      ctx.restore();
    }
    rafId = requestAnimationFrame(loop);
  }

  // --- Lifecycle ---
  function destroyCanvas() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (intersectionObs) { intersectionObs.disconnect(); intersectionObs = null; }
    if (themeObs) { themeObs.disconnect(); themeObs = null; }
    var anim = getAnim(ANIM_KEYS[currentIndex]);
    if (anim && anim.cleanup) { try { anim.cleanup(); } catch (e) {} }
    // Restore hero-glow and remove overflow-hidden if canvas is being destroyed
    var canvas = document.getElementById('hero-canvas');
    if (canvas) {
      var section = canvas.closest('section');
      if (section) {
        section.classList.remove('overflow-hidden');
        section.classList.add('hero-glow');
      }
    }
    currentIndex = -1;
    pendingIndex = -1;
  }

  function initCanvas() {
    var canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    var section = canvas.closest('section');
    if (!section) return;

    // Reduced motion check
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Hero-glow swap + overflow-hidden
    section.classList.remove('hero-glow');
    section.classList.add('overflow-hidden');

    readColors();
    sizeCanvas(canvas, section);

    // Pick animation
    var stored = null;
    try { stored = sessionStorage.getItem('adrianwedd_heroAnimation'); } catch (e) {}
    var startIndex = stored !== null ? parseInt(stored, 10) : Math.floor(Math.random() * ANIM_KEYS.length);
    if (isNaN(startIndex) || startIndex < 0 || startIndex >= ANIM_KEYS.length) startIndex = 0;
    currentIndex = startIndex;

    var anim = getAnim(ANIM_KEYS[currentIndex]);
    try { anim.init(canvasW, canvasH, colors); } catch (e) { console.warn('HeroCanvas init error:', e); }
    updateSwitcherUI(currentIndex);

    // Theme change observer (re-created on each init since destroyCanvas disconnects it)
    themeObs = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].attributeName === 'class') { readColors(); break; }
      }
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // IntersectionObserver — pause when not visible
    intersectionObs = new IntersectionObserver(function (entries) {
      isVisible = entries[0].isIntersecting;
    }, { threshold: 0 });
    intersectionObs.observe(section);

    // Start render loop
    adaptiveQuality = 1.0;
    fastFrameCount = 0;
    startLoop(canvas, ctx);
  }

  // --- Sentinel-guarded global listeners (registered once, survive VT swaps) ---
  if (!document.documentElement.dataset.heroCanvasInit) {
    document.documentElement.dataset.heroCanvasInit = '1';

    // Click delegation for switcher pills
    document.addEventListener('click', function (e) {
      var tab = e.target.closest && e.target.closest('.hero-anim-tab');
      if (!tab) return;
      var index = parseInt(tab.dataset.index, 10);
      var canvas = document.getElementById('hero-canvas');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      if (!ctx) return;
      switchAnimation(index, canvas, ctx, canvas.closest('section'));
    });

    // Keyboard navigation for switcher (focus-scoped)
    document.addEventListener('keydown', function (e) {
      var active = document.activeElement;
      if (!active || !active.classList.contains('hero-anim-tab')) return;
      var tabs = Array.from(document.querySelectorAll('.hero-anim-tab'));
      var idx = tabs.indexOf(active);
      if (idx === -1) return;

      var newIdx = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        newIdx = (idx + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        newIdx = (idx - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        newIdx = 0;
      } else if (e.key === 'End') {
        newIdx = tabs.length - 1;
      }
      if (newIdx === -1) return;
      e.preventDefault();
      tabs[newIdx].focus();
      tabs[newIdx].click();
    });

    // Resize handler (debounced)
    window.addEventListener('resize', function () {
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(function () {
        resizePending = false;
        var canvas = document.getElementById('hero-canvas');
        if (!canvas) return;
        var section = canvas.closest('section');
        if (!section) return;
        sizeCanvas(canvas, section);
        var anim = getAnim(ANIM_KEYS[currentIndex]);
        try { anim.init(canvasW, canvasH, colors); } catch (e) {}
      });
    });

    // VT swap handler
    document.addEventListener('astro:after-swap', function () {
      destroyCanvas();
      initCanvas();
    });
  }

  // Unconditional init (runs on first load AND after VT swap re-execution)
  initCanvas();
})();
</script>
```

- [ ] **Step 2: Verify the file was created correctly**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "feat: create HeroCanvas.astro framework shell

Canvas element, readability overlay, switcher HTML, lifecycle management
(init/destroy/resize/theme), VT compat, IntersectionObserver pause,
adaptive quality, and animation switching with fade. No animation
implementations yet — placeholder only."
```

---

### Task 4: Integrate HeroCanvas into index.astro

**Files:**
- Modify: `src/pages/index.astro:1-5` (imports)
- Modify: `src/pages/index.astro:92-123` (hero section)

- [ ] **Step 1: Add import**

At the top of the frontmatter block (after the existing imports around line 7), add:

```typescript
import HeroCanvas from '../components/HeroCanvas.astro';
```

- [ ] **Step 2: Restructure hero section for canvas integration**

The `HeroCanvas` component outputs two elements: a canvas wrapper (absolute) and a switcher (relative). The switcher must render AFTER the hero content (at the bottom of the hero). To achieve this, we import HeroCanvas but render its elements around the existing content.

Since Astro components render their full template where they're placed, and we need the switcher at the bottom, the approach is:

1. Import `HeroCanvas` and place it as the first child (the canvas wrapper is absolute so order doesn't matter for it).
2. The switcher is part of the same component output and will appear after the canvas wrapper in DOM order.
3. Wrap existing hero content in a `relative z-10` div BETWEEN the canvas and switcher.

However, since Astro components output all their HTML as a block, the simplest approach is to place `<HeroCanvas />` at the END of the hero section (after the content). The canvas wrapper uses `absolute inset-0` so it renders behind regardless of DOM position. The switcher then naturally appears at the bottom.

Change the hero section from:

```html
<section class="hero-glow mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
    <Personalisation client:load />
    <h1 class="animate-in text-text">Adrian Wedd</h1>
    ...buttons...
  </section>
```

To:

```html
<section class="hero-glow relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
    <div class="relative z-10">
      <Personalisation client:load />
      <h1 class="animate-in text-text">Adrian Wedd</h1>
      <p
        class="animate-in mt-4 max-w-prose text-xl leading-relaxed text-text-muted sm:text-2xl"
        style="animation-delay: 0.1s"
      >
        I build things that work for people who need them — and I break things on purpose to make sure they actually do.
      </p>
      <p class="animate-in mt-6 max-w-prose text-base leading-relaxed text-text-muted" style="animation-delay: 0.2s">
        Greenpeace Actions to government cybersecurity to AI safety. Nearly 45 years across the
        stack. Same methodology every time: enumerate failure modes before you move. This is the
        workshop — finished work, active research, and raw thinking.
      </p>
      <div class="animate-in mt-8 flex flex-wrap gap-4" style="animation-delay: 0.3s">
        <a
          href="/projects/"
          class="btn-primary inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-surface no-underline hover:opacity-90"
        >
          View Projects
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
        <a
          href="/blog/"
          class="btn-secondary inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-muted no-underline hover:border-accent hover:text-accent"
        >
          Read Blog
        </a>
      </div>
    </div>
    <HeroCanvas />
  </section>
```

**Key points:**
- `relative` added to section (required for absolute canvas positioning).
- `hero-glow` stays (removed by JS when canvas inits).
- `<HeroCanvas />` placed LAST — canvas wrapper is absolute so renders behind content, switcher renders at bottom in normal flow.
- All existing content wrapped in `<div class="relative z-10">` to float above canvas.

- [ ] **Step 4: Verify build and dev server**

Run: `npm run build`
Expected: Build succeeds. Canvas renders as empty (placeholder animation), switcher pills are visible.

Run: `npm run dev` and visually confirm:
- Hero content is still readable
- Switcher pills appear below the hero text
- No layout shift or broken styling

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: integrate HeroCanvas into homepage hero section

Add canvas component as first child of hero section with z-10 wrapper
for all content elements. hero-glow class removed dynamically by JS
when canvas initializes."
```

---

### Task 5: Implement Simplex Noise

**Files:**
- Modify: `src/components/HeroCanvas.astro` (add inside script block)

Compact 2D/3D simplex noise function used by Flow Field, Terrain Contours, and Erosion Channels.

- [ ] **Step 1: Add simplex noise implementation**

Inside the `<script is:inline>` block of `HeroCanvas.astro`, immediately after the `readColors()` function definition, add the shared simplex noise implementation. Use a compact 3D simplex noise (needed for temporal evolution via z-offset):

```javascript
// --- Simplex noise (compact 3D) ---
var NOISE_GRAD3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
var NOISE_PERM = new Uint8Array(512);
(function () {
  var p = [];
  for (var i = 0; i < 256; i++) p[i] = i;
  for (var i = 255; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = p[i]; p[i] = p[j]; p[j] = t; }
  for (var i = 0; i < 512; i++) NOISE_PERM[i] = p[i & 255];
})();

function noise3D(x, y, z) {
  var F3 = 1/3, G3 = 1/6;
  var s = (x + y + z) * F3;
  var i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
  var t = (i + j + k) * G3;
  var X0 = i - t, Y0 = j - t, Z0 = k - t;
  var x0 = x - X0, y0 = y - Y0, z0 = z - Z0;
  var i1, j1, k1, i2, j2, k2;
  if (x0 >= y0) {
    if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
    else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
    else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
  } else {
    if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
    else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
    else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
  }
  var x1=x0-i1+G3, y1=y0-j1+G3, z1=z0-k1+G3;
  var x2=x0-i2+2*G3, y2=y0-j2+2*G3, z2=z0-k2+2*G3;
  var x3=x0-1+3*G3, y3=y0-1+3*G3, z3=z0-1+3*G3;
  var ii=i&255, jj=j&255, kk=k&255;
  function dot3(g,x,y,z){return g[0]*x+g[1]*y+g[2]*z;}
  var n0=0,n1=0,n2=0,n3=0;
  var t0=0.6-x0*x0-y0*y0-z0*z0;
  if(t0>=0){t0*=t0;var gi=NOISE_PERM[ii+NOISE_PERM[jj+NOISE_PERM[kk]]]%12;n0=t0*t0*dot3(NOISE_GRAD3[gi],x0,y0,z0);}
  var t1=0.6-x1*x1-y1*y1-z1*z1;
  if(t1>=0){t1*=t1;var gi=NOISE_PERM[ii+i1+NOISE_PERM[jj+j1+NOISE_PERM[kk+k1]]]%12;n1=t1*t1*dot3(NOISE_GRAD3[gi],x1,y1,z1);}
  var t2=0.6-x2*x2-y2*y2-z2*z2;
  if(t2>=0){t2*=t2;var gi=NOISE_PERM[ii+i2+NOISE_PERM[jj+j2+NOISE_PERM[kk+k2]]]%12;n2=t2*t2*dot3(NOISE_GRAD3[gi],x2,y2,z2);}
  var t3=0.6-x3*x3-y3*y3-z3*z3;
  if(t3>=0){t3*=t3;var gi=NOISE_PERM[ii+1+NOISE_PERM[jj+1+NOISE_PERM[kk+1]]]%12;n3=t3*t3*dot3(NOISE_GRAD3[gi],x3,y3,z3);}
  return 32*(n0+n1+n2+n3);
}

function noise2D(x, y) { return noise3D(x, y, 0); }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "feat: add shared simplex noise for canvas animations

Compact inline 3D simplex noise function (~1.5KB). Used by Flow Field,
Terrain Contours, and Erosion Channels animations."
```

---

### Task 6: Implement Mycelium Network Animation

**Files:**
- Modify: `src/components/HeroCanvas.astro` (add to ANIMATIONS object)

- [ ] **Step 1: Add Mycelium Network animation**

In `HeroCanvas.astro`, in the `<script is:inline>` block, replace the placeholder animation registry section. After the `ANIMATIONS.placeholder` definition, add the Mycelium Network implementation:

```javascript
ANIMATIONS.mycelium = (function () {
  var branches = [];
  var deadBranches = [];
  var seeds = [];
  var w, h, col;
  var regrowTimer = 0;
  var fadeAlpha = 1;

  function Branch(x, y, angle, thickness, depth) {
    this.x = x; this.y = y; this.angle = angle;
    this.thickness = thickness; this.depth = depth;
    this.alive = true; this.age = 0;
  }

  function init(cw, ch, colors) {
    w = cw; h = ch; col = colors;
    branches = []; deadBranches = []; seeds = [];
    regrowTimer = 0; fadeAlpha = 1;
    var seedCount = 5 + Math.floor(Math.random() * 4);
    for (var i = 0; i < seedCount; i++) {
      var sx = Math.random() * w, sy = Math.random() * h;
      var angle = Math.random() * Math.PI * 2;
      branches.push(new Branch(sx, sy, angle, 2, 0));
    }
  }

  function frame(ctx, cw, ch, t, colors, quality) {
    w = cw; h = ch; col = colors;
    var maxBranches = Math.floor(600 * quality);

    // Fade background for trail effect
    ctx.fillStyle = col.surface;
    ctx.globalAlpha = 0.01;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = fadeAlpha;

    // Grow branches
    var newBranches = [];
    for (var i = branches.length - 1; i >= 0; i--) {
      var b = branches[i];
      if (!b.alive) continue;
      b.age++;

      // Move
      var speed = 0.8;
      var nx = b.x + Math.cos(b.angle) * speed;
      var ny = b.y + Math.sin(b.angle) * speed;

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = col.accent;
      ctx.globalAlpha = fadeAlpha * (0.3 + b.thickness * 0.15);
      ctx.lineWidth = b.thickness;
      ctx.lineCap = 'round';
      ctx.stroke();

      b.x = nx; b.y = ny;

      // Slight wander
      b.angle += (Math.random() - 0.5) * 0.15;

      // Branch
      if (b.depth < 12 && Math.random() < 0.03 && branches.length + newBranches.length < maxBranches) {
        var branchAngle = b.angle + (Math.random() > 0.5 ? 1 : -1) * (0.26 + Math.random() * 0.52);
        newBranches.push(new Branch(b.x, b.y, branchAngle, b.thickness * 0.7, b.depth + 1));
      }

      // Anastomosis check (fuse with nearby tips)
      for (var j = i - 1; j >= Math.max(0, i - 30); j--) {
        var other = branches[j];
        if (!other.alive || other === b) continue;
        var dx = b.x - other.x, dy = b.y - other.y;
        if (dx * dx + dy * dy < 225) { // 15px radius
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(other.x, other.y);
          ctx.strokeStyle = col.accent;
          ctx.globalAlpha = fadeAlpha * 0.5;
          ctx.lineWidth = Math.min(b.thickness, other.thickness) * 0.5;
          ctx.stroke();
          b.alive = false;
          break;
        }
      }

      // Kill if out of bounds or too thin
      if (nx < -10 || nx > w + 10 || ny < -10 || ny > h + 10 || b.thickness < 0.3 || b.age > 400) {
        b.alive = false;
      }
    }

    branches = branches.concat(newBranches);

    // Regrow cycle
    var aliveCount = 0;
    for (var i = 0; i < branches.length; i++) { if (branches[i].alive) aliveCount++; }
    if (aliveCount === 0) {
      regrowTimer++;
      if (regrowTimer > 60) { // ~1 second pause
        init(w, h, col);
      }
    }

    ctx.globalAlpha = 1;
  }

  function cleanup() { branches = []; deadBranches = []; }

  return { init: init, frame: frame, cleanup: cleanup };
})();
```

- [ ] **Step 2: Run dev server and visually verify**

Run: `npm run dev`
Navigate to localhost:4321, click "Mycelium" pill. Verify branching copper filaments grow across the dark background.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "feat: implement Mycelium Network animation

Growing fungal hyphae with probabilistic branching and anastomosis
(tip fusion). Copper filaments on dark background, auto-regrow cycle."
```

---

### Task 7: Implement Fractal Fern Animation

**Files:**
- Modify: `src/components/HeroCanvas.astro`

- [ ] **Step 1: Add Fractal Fern animation**

Add after the mycelium animation:

```javascript
ANIMATIONS.fern = (function () {
  var w, h, col;
  var px, py; // current point
  var pointsPerFrame = 200;
  var windPhase = 0;
  var totalPoints = 0;
  var maxPoints = 50000;

  function init(cw, ch, colors) {
    w = cw; h = ch; col = colors;
    px = 0; py = 0;
    windPhase = 0; totalPoints = 0;
  }

  function frame(ctx, cw, ch, t, colors, quality) {
    w = cw; h = ch; col = colors;
    var ppf = Math.floor(pointsPerFrame * quality);
    windPhase = t * 0.001 * 0.785; // ~8s period
    var windAngle = Math.sin(windPhase) * 0.02;
    var cosW = Math.cos(windAngle), sinW = Math.sin(windAngle);

    // Barnsley fern transforms
    for (var i = 0; i < ppf; i++) {
      if (totalPoints >= maxPoints) {
        // Reset with fade
        ctx.fillStyle = col.surface;
        ctx.globalAlpha = 0.02;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
        totalPoints = 0;
        px = 0; py = 0;
        return;
      }

      var r = Math.random();
      var nx, ny;
      if (r < 0.01) {
        nx = 0; ny = 0.16 * py;
      } else if (r < 0.86) {
        nx = 0.85 * px + 0.04 * py;
        ny = -0.04 * px + 0.85 * py + 1.6;
      } else if (r < 0.93) {
        nx = 0.2 * px - 0.26 * py;
        ny = 0.23 * px + 0.22 * py + 1.6;
      } else {
        nx = -0.15 * px + 0.28 * py;
        ny = 0.26 * px + 0.24 * py + 0.44;
      }
      px = nx; py = ny;

      // Apply wind sway
      var swayedX = px * cosW - py * sinW;
      var swayedY = px * sinW + py * cosW;

      // Map to canvas: fern range is roughly x:[-2.2, 2.7], y:[0, 10]
      var scale = h * 0.06;
      var sx = w * 0.5 + swayedX * scale;
      var sy = h * 0.95 - swayedY * scale;

      // Color gradient based on height
      var heightRatio = swayedY / 10;
      ctx.globalAlpha = 0.4 + heightRatio * 0.3;
      ctx.fillStyle = col.accent;
      ctx.fillRect(sx, sy, 1.2, 1.2);

      totalPoints++;
    }
    ctx.globalAlpha = 1;
  }

  function cleanup() { totalPoints = maxPoints; }

  return { init: init, frame: frame, cleanup: cleanup };
})();
```

- [ ] **Step 2: Visually verify**

Run: `npm run dev`, click "Fern" pill. Barnsley fern should materialize point-by-point with subtle wind sway.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "feat: implement Fractal Fern animation

Barnsley fern via iterated affine transforms, 200 points/frame.
Wind sway oscillation, copper gradient by height."
```

---

### Task 8: Implement Flow Field Animation

**Files:**
- Modify: `src/components/HeroCanvas.astro`

- [ ] **Step 1: Add Flow Field animation**

```javascript
ANIMATIONS.flow = (function () {
  var particles = [];
  var w, h, col;
  var zOff = 0;
  var baseCount = 400;

  function Particle() {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.prevX = this.x;
    this.prevY = this.y;
  }

  function init(cw, ch, colors) {
    w = cw; h = ch; col = colors;
    particles = [];
    zOff = 0;
    for (var i = 0; i < baseCount; i++) particles.push(new Particle());
  }

  function frame(ctx, cw, ch, t, colors, quality) {
    w = cw; h = ch; col = colors;
    var count = Math.floor(baseCount * quality);

    // Fade trail
    ctx.fillStyle = col.surface;
    ctx.globalAlpha = 0.02;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.6;

    zOff += 0.0005;
    var noiseScale = 0.003;
    var speed = 1.5;

    ctx.strokeStyle = col.accent;
    ctx.lineWidth = 0.8;

    for (var i = 0; i < Math.min(count, particles.length); i++) {
      var p = particles[i];
      p.prevX = p.x;
      p.prevY = p.y;

      var angle = noise3D(p.x * noiseScale, p.y * noiseScale, zOff) * Math.PI * 4;
      p.x += Math.cos(angle) * speed;
      p.y += Math.sin(angle) * speed;

      // Draw trail segment
      ctx.beginPath();
      ctx.moveTo(p.prevX, p.prevY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      // Respawn if off-canvas
      if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        p.prevX = p.x;
        p.prevY = p.y;
      }
    }
    ctx.globalAlpha = 1;
  }

  function cleanup() { particles = []; }

  return { init: init, frame: frame, cleanup: cleanup };
})();
```

- [ ] **Step 2: Visually verify + commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "feat: implement Flow Field animation

Perlin noise vector field with 400 particles leaving fading trails.
Slowly evolving noise z-offset for temporal evolution."
```

---

### Task 9: Implement Root Tendrils Animation

**Files:**
- Modify: `src/components/HeroCanvas.astro`

- [ ] **Step 1: Add Root Tendrils animation**

```javascript
ANIMATIONS.roots = (function () {
  var tips = [];
  var w, h, col;
  var rootSystems = [];
  var maxSystems = 3;

  function Tip(x, y, angle, thickness, depth) {
    this.x = x; this.y = y; this.angle = angle;
    this.thickness = thickness; this.depth = depth;
    this.alive = true;
  }

  function newRootSystem() {
    var system = { tips: [], alpha: 1 };
    var count = 3 + Math.floor(Math.random() * 3);
    for (var i = 0; i < count; i++) {
      var x = Math.random() * w;
      system.tips.push(new Tip(x, -5, Math.PI / 2 + (Math.random() - 0.5) * 0.3, 3, 0));
    }
    return system;
  }

  function init(cw, ch, colors) {
    w = cw; h = ch; col = colors;
    rootSystems = [newRootSystem()];
  }

  function frame(ctx, cw, ch, t, colors, quality) {
    w = cw; h = ch; col = colors;
    ctx.fillStyle = col.surface;
    ctx.globalAlpha = 0.005;
    ctx.fillRect(0, 0, w, h);

    for (var s = 0; s < rootSystems.length; s++) {
      var system = rootSystems[s];
      ctx.globalAlpha = system.alpha;
      var anyAlive = false;

      for (var i = 0; i < system.tips.length; i++) {
        var tip = system.tips[i];
        if (!tip.alive) continue;
        anyAlive = true;

        var speed = 1.2;
        // Gravity bias: 70% down, 30% wander
        var gravityAngle = Math.PI / 2;
        tip.angle = tip.angle * 0.3 + gravityAngle * 0.7 + (Math.random() - 0.5) * 0.4;
        var nx = tip.x + Math.cos(tip.angle) * speed;
        var ny = tip.y + Math.sin(tip.angle) * speed;

        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = col.accent;
        ctx.lineWidth = tip.thickness;
        ctx.lineCap = 'round';
        ctx.stroke();

        tip.x = nx; tip.y = ny;

        // Branch
        if (tip.depth < 10 && tip.thickness > 0.5 && Math.random() < 0.02 * quality) {
          var branchAngle = tip.angle + (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5);
          system.tips.push(new Tip(tip.x, tip.y, branchAngle, tip.thickness * 0.7, tip.depth + 1));
        }

        // Die at edge or too thin
        if (ny > h + 10 || nx < -10 || nx > w + 10 || tip.thickness < 0.5) {
          tip.alive = false;
        }
      }

      if (!anyAlive) {
        system.alpha = Math.max(0, system.alpha - 0.002);
      }
    }

    // Spawn new system if all old ones are fading
    var allFading = rootSystems.every(function (s) { return s.alpha < 0.5; });
    if (allFading && rootSystems.length < maxSystems) {
      rootSystems.push(newRootSystem());
    }

    // Remove fully faded systems
    rootSystems = rootSystems.filter(function (s) { return s.alpha > 0.01; });
    if (rootSystems.length === 0) rootSystems.push(newRootSystem());

    ctx.globalAlpha = 1;
  }

  function cleanup() { rootSystems = []; }

  return { init: init, frame: frame, cleanup: cleanup };
})();
```

- [ ] **Step 2: Visually verify + commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "feat: implement Root Tendrils animation

Gravity-biased random walk roots growing from top edge with
probabilistic branching. Completed systems fade as new ones grow."
```

---

### Task 10: Implement Neural Garden Animation

**Files:**
- Modify: `src/components/HeroCanvas.astro`

- [ ] **Step 1: Add Neural Garden animation**

Uses approximate Poisson disk sampling for organic node placement:

```javascript
ANIMATIONS.neural = (function () {
  var nodes = [];
  var edges = [];
  var pulses = [];
  var w, h, col;
  var lastPulse = 0;

  function poissonDisk(w, h, minDist, maxAttempts) {
    var cellSize = minDist / Math.SQRT2;
    var cols = Math.ceil(w / cellSize), rows = Math.ceil(h / cellSize);
    var grid = new Array(cols * rows).fill(-1);
    var points = [];
    var active = [];

    function gridIdx(x, y) { return Math.floor(x / cellSize) + Math.floor(y / cellSize) * cols; }

    var x0 = w / 2, y0 = h / 2;
    points.push({ x: x0, y: y0 });
    grid[gridIdx(x0, y0)] = 0;
    active.push(0);

    while (active.length > 0 && points.length < 60) {
      var ri = Math.floor(Math.random() * active.length);
      var pi = active[ri];
      var found = false;
      for (var a = 0; a < maxAttempts; a++) {
        var angle = Math.random() * Math.PI * 2;
        var dist = minDist + Math.random() * minDist;
        var nx = points[pi].x + Math.cos(angle) * dist;
        var ny = points[pi].y + Math.sin(angle) * dist;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        var gi = gridIdx(nx, ny);
        var ok = true;
        var gc = Math.floor(nx / cellSize), gr = Math.floor(ny / cellSize);
        for (var dy = -2; dy <= 2 && ok; dy++) {
          for (var dx = -2; dx <= 2 && ok; dx++) {
            var nc = gc + dx, nr = gr + dy;
            if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
            var ni = grid[nc + nr * cols];
            if (ni >= 0) {
              var ddx = points[ni].x - nx, ddy = points[ni].y - ny;
              if (ddx * ddx + ddy * ddy < minDist * minDist) ok = false;
            }
          }
        }
        if (ok) {
          points.push({ x: nx, y: ny });
          grid[gi] = points.length - 1;
          active.push(points.length - 1);
          found = true;
          break;
        }
      }
      if (!found) active.splice(ri, 1);
    }
    return points;
  }

  function init(cw, ch, colors) {
    w = cw; h = ch; col = colors;
    nodes = poissonDisk(w, h, 80, 30);
    nodes.forEach(function (n) { n.glow = 0; n.radius = 3; });
    edges = [];
    var connDist = 150;
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < connDist) edges.push({ a: i, b: j, dist: d, glow: 0 });
      }
    }
    pulses = []; lastPulse = 0;
  }

  function frame(ctx, cw, ch, t, colors, quality) {
    w = cw; h = ch; col = colors;
    ctx.clearRect(0, 0, w, h);

    // Fire pulse every 2-3 seconds
    if (t - lastPulse > 2000 + Math.random() * 1000) {
      lastPulse = t;
      var src = Math.floor(Math.random() * nodes.length);
      pulses.push({ node: src, time: t, visited: {} });
      pulses[pulses.length - 1].visited[src] = t;
    }

    // Update pulses
    var pulseSpeed = 100; // px/s
    for (var p = pulses.length - 1; p >= 0; p--) {
      var pulse = pulses[p];
      var elapsed = (t - pulse.time) / 1000;
      if (elapsed > 5) { pulses.splice(p, 1); continue; }

      for (var e = 0; e < edges.length; e++) {
        var edge = edges[e];
        var aVisited = pulse.visited[edge.a] !== undefined;
        var bVisited = pulse.visited[edge.b] !== undefined;
        if (aVisited && !bVisited) {
          var travelTime = edge.dist / pulseSpeed;
          var arriveAt = pulse.visited[edge.a] + travelTime * 1000;
          if (t >= arriveAt) {
            pulse.visited[edge.b] = t;
            nodes[edge.b].glow = 1;
            edge.glow = 1;
          } else {
            edge.glow = Math.max(edge.glow, 0.5);
          }
        } else if (bVisited && !aVisited) {
          var travelTime = edge.dist / pulseSpeed;
          var arriveAt = pulse.visited[edge.b] + travelTime * 1000;
          if (t >= arriveAt) {
            pulse.visited[edge.a] = t;
            nodes[edge.a].glow = 1;
            edge.glow = 1;
          } else {
            edge.glow = Math.max(edge.glow, 0.5);
          }
        }
      }
    }

    // Draw edges
    for (var e = 0; e < edges.length; e++) {
      var edge = edges[e];
      ctx.beginPath();
      ctx.moveTo(nodes[edge.a].x, nodes[edge.a].y);
      ctx.lineTo(nodes[edge.b].x, nodes[edge.b].y);
      ctx.strokeStyle = col.accent;
      ctx.globalAlpha = 0.08 + edge.glow * 0.4;
      ctx.lineWidth = 0.5 + edge.glow;
      ctx.stroke();
      edge.glow *= 0.95;
    }

    // Draw nodes
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      // Glow halo
      if (n.glow > 0.05) {
        var grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 12);
        grad.addColorStop(0, col.accent);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.globalAlpha = n.glow * 0.6;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      // Core dot
      ctx.fillStyle = col.accent;
      ctx.globalAlpha = 0.3 + n.glow * 0.7;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
      n.glow *= 0.97;
    }
    ctx.globalAlpha = 1;
  }

  function cleanup() { nodes = []; edges = []; pulses = []; }

  return { init: init, frame: frame, cleanup: cleanup };
})();
```

- [ ] **Step 2: Visually verify + commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "feat: implement Neural Garden animation

Poisson disk-sampled nodes with proximity edges. Activation pulses
propagate along edges at 100px/s with copper glow effects."
```

---

### Task 11: Implement Terrain Contours Animation

**Files:**
- Modify: `src/components/HeroCanvas.astro`

- [ ] **Step 1: Add Terrain Contours animation**

Uses marching squares on a noise field:

```javascript
ANIMATIONS.terrain = (function () {
  var w, h, col;
  var zOff = 0;
  var gridRes = 8;

  function init(cw, ch, colors) {
    w = cw; h = ch; col = colors;
  }

  function isoLerp(a, b, va, vb, threshold) { var t = (threshold - va) / (vb - va); return a + t * (b - a); }

  function frame(ctx, cw, ch, t, colors, quality) {
    w = cw; h = ch; col = colors;
    ctx.clearRect(0, 0, w, h);
    zOff += 0.0003;

    var noiseScale = 0.005;
    var levels = Math.floor(10 * quality);
    if (levels < 3) levels = 3;
    var actualRes = gridRes;
    if (quality < 0.5) actualRes = gridRes * 2; // reduce grid density under load
    var cols = Math.ceil(w / actualRes) + 1;
    var rows = Math.ceil(h / actualRes) + 1;

    // Sample noise grid
    var grid = new Float32Array(cols * rows);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        grid[r * cols + c] = noise3D(c * actualRes * noiseScale, r * actualRes * noiseScale, zOff);
      }
    }

    // Marching squares for each contour level
    ctx.strokeStyle = col.accent;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';

    for (var level = 0; level < levels; level++) {
      var threshold = -0.8 + (level / levels) * 1.6;
      ctx.globalAlpha = 0.15 + (level / levels) * 0.35;

      ctx.beginPath();
      for (var r = 0; r < rows - 1; r++) {
        for (var c = 0; c < cols - 1; c++) {
          var tl = grid[r * cols + c];
          var tr = grid[r * cols + c + 1];
          var br = grid[(r + 1) * cols + c + 1];
          var bl = grid[(r + 1) * cols + c];

          var config = 0;
          if (tl > threshold) config |= 8;
          if (tr > threshold) config |= 4;
          if (br > threshold) config |= 2;
          if (bl > threshold) config |= 1;

          if (config === 0 || config === 15) continue;

          var x = c * actualRes, y = r * actualRes;
          var g = actualRes;

          var top = isoLerp(x, x + g, tl, tr, threshold);
          var right = isoLerp(y, y + g, tr, br, threshold);
          var bottom = isoLerp(x, x + g, bl, br, threshold);
          var left = isoLerp(y, y + g, tl, bl, threshold);

          // Draw line segments based on marching squares case
          switch (config) {
            case 1: case 14: ctx.moveTo(x, left); ctx.lineTo(bottom, y + g); break;
            case 2: case 13: ctx.moveTo(bottom, y + g); ctx.lineTo(x + g, right); break;
            case 3: case 12: ctx.moveTo(x, left); ctx.lineTo(x + g, right); break;
            case 4: case 11: ctx.moveTo(top, y); ctx.lineTo(x + g, right); break;
            case 5:
              ctx.moveTo(x, left); ctx.lineTo(top, y);
              ctx.moveTo(bottom, y + g); ctx.lineTo(x + g, right);
              break;
            case 6: case 9: ctx.moveTo(top, y); ctx.lineTo(bottom, y + g); break;
            case 7: case 8: ctx.moveTo(x, left); ctx.lineTo(top, y); break;
            case 10:
              ctx.moveTo(x, left); ctx.lineTo(bottom, y + g);
              ctx.moveTo(top, y); ctx.lineTo(x + g, right);
              break;
          }
        }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function cleanup() {}

  return { init: init, frame: frame, cleanup: cleanup };
})();
```

- [ ] **Step 2: Visually verify + commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "feat: implement Terrain Contours animation

Marching squares on evolving simplex noise field. 10 contour levels
with copper opacity gradient, topographic map aesthetic."
```

---

### Task 12: Implement Spore Drift Animation

**Files:**
- Modify: `src/components/HeroCanvas.astro`

- [ ] **Step 1: Add Spore Drift animation**

```javascript
ANIMATIONS.spores = (function () {
  var spores = [];
  var w, h, col;
  var baseCount = 100;

  function Spore() {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.r = 1 + Math.random() * 3;
    this.vx = 0; this.vy = 0;
    this.trail = [];
    this.trailLen = 3 + Math.floor(Math.random() * 2);
    this.depth = this.r / 4; // 0.25-1.0 for depth effect
  }

  function init(cw, ch, colors) {
    w = cw; h = ch; col = colors;
    spores = [];
    for (var i = 0; i < baseCount; i++) spores.push(new Spore());
  }

  function frame(ctx, cw, ch, t, colors, quality) {
    w = cw; h = ch; col = colors;
    ctx.clearRect(0, 0, w, h);
    var count = Math.floor(baseCount * quality);

    for (var i = 0; i < Math.min(count, spores.length); i++) {
      var s = spores[i];

      // Brownian motion + downward drift
      s.vx += (Math.random() - 0.5) * 0.3;
      s.vy += (Math.random() - 0.5) * 0.3 + 0.1 * s.depth;
      s.vx *= 0.95;
      s.vy *= 0.95;
      s.x += s.vx * s.depth;
      s.y += s.vy * s.depth;

      // Trail
      s.trail.unshift({ x: s.x, y: s.y });
      if (s.trail.length > s.trailLen) s.trail.pop();

      // Wrap
      if (s.y > h + 20) { s.y = -10; s.x = Math.random() * w; s.trail = []; }
      if (s.x < -20) s.x = w + 10;
      if (s.x > w + 20) s.x = -10;

      // Draw glow halo
      var glowR = s.r * 3;
      var grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
      grad.addColorStop(0, col.accent);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.1 * s.depth;
      ctx.beginPath();
      ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Draw filament trail (bezier)
      if (s.trail.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(s.trail[0].x, s.trail[0].y);
        for (var j = 1; j < s.trail.length - 1; j++) {
          var cx = (s.trail[j].x + s.trail[j + 1].x) / 2;
          var cy = (s.trail[j].y + s.trail[j + 1].y) / 2;
          ctx.quadraticCurveTo(s.trail[j].x, s.trail[j].y, cx, cy);
        }
        ctx.strokeStyle = col.accent;
        ctx.globalAlpha = 0.25 * s.depth;
        ctx.lineWidth = s.r * 0.3;
        ctx.stroke();
      }

      // Draw core
      ctx.fillStyle = col.accent;
      ctx.globalAlpha = 0.4 + 0.4 * s.depth;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function cleanup() { spores = []; }

  return { init: init, frame: frame, cleanup: cleanup };
})();
```

- [ ] **Step 2: Visually verify + commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "feat: implement Spore Drift animation

Floating particles with Brownian motion, bezier-curved filament
trails, depth illusion via size/opacity/speed variation."
```

---

### Task 13: Implement Erosion Channels Animation

**Files:**
- Modify: `src/components/HeroCanvas.astro`

- [ ] **Step 1: Add Erosion Channels animation**

```javascript
ANIMATIONS.erosion = (function () {
  var w, h, col;
  var heightmap = null;
  var channels = [];
  var phase = 'flowing'; // 'flowing', 'hold', 'fading'
  var phaseTimer = 0;
  var fadeAlpha = 1;
  var hmCols, hmRows, hmRes;

  function generateHeightmap() {
    hmRes = 4;
    hmCols = Math.ceil(w / hmRes) + 1;
    hmRows = Math.ceil(h / hmRes) + 1;
    heightmap = new Float32Array(hmCols * hmRows);
    var seed = Math.random() * 100;
    for (var r = 0; r < hmRows; r++) {
      for (var c = 0; c < hmCols; c++) {
        heightmap[r * hmCols + c] = noise2D(c * 0.03 + seed, r * 0.03 + seed);
      }
    }
  }

  function traceChannel(sx, sy) {
    var path = [];
    var cx = Math.floor(sx / hmRes), cy = Math.floor(sy / hmRes);
    var flow = new Float32Array(hmCols * hmRows);
    var visited = {};
    var maxSteps = 500;

    for (var step = 0; step < maxSteps; step++) {
      if (cx < 0 || cx >= hmCols || cy < 0 || cy >= hmRows) break;
      var cellKey = cx + ',' + cy;
      if (visited[cellKey]) break; // prevent ping-pong between basins
      visited[cellKey] = true;
      var idx = cy * hmCols + cx;
      flow[idx]++;
      path.push({ x: cx * hmRes, y: cy * hmRes, flow: flow[idx] });

      // Find steepest descent
      var bestC = cx, bestR = cy, bestH = heightmap[idx];
      var dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      for (var d = 0; d < dirs.length; d++) {
        var nc = cx + dirs[d][0], nr = cy + dirs[d][1];
        if (nc < 0 || nc >= hmCols || nr < 0 || nr >= hmRows) continue;
        var nh = heightmap[nr * hmCols + nc];
        if (nh < bestH) { bestH = nh; bestC = nc; bestR = nr; }
      }

      if (bestC === cx && bestR === cy) {
        // Local minimum — fill basin to lowest neighbor + epsilon
        var lowestNeighbor = Infinity;
        for (var d = 0; d < dirs.length; d++) {
          var nc2 = cx + dirs[d][0], nr2 = cy + dirs[d][1];
          if (nc2 < 0 || nc2 >= hmCols || nr2 < 0 || nr2 >= hmRows) continue;
          lowestNeighbor = Math.min(lowestNeighbor, heightmap[nr2 * hmCols + nc2]);
        }
        heightmap[idx] = lowestNeighbor + 0.001;
        // Re-scan to find where to flow next
        bestH = Infinity;
        for (var d = 0; d < dirs.length; d++) {
          var nc = cx + dirs[d][0], nr = cy + dirs[d][1];
          if (nc < 0 || nc >= hmCols || nr < 0 || nr >= hmRows) continue;
          var nh = heightmap[nr * hmCols + nc];
          if (nh < bestH) { bestH = nh; bestC = nc; bestR = nr; }
        }
      }

      cx = bestC; cy = bestR;
    }
    return path;
  }

  function init(cw, ch, colors) {
    w = cw; h = ch; col = colors;
    generateHeightmap();
    channels = [];
    var seedCount = 8 + Math.floor(Math.random() * 5);
    for (var i = 0; i < seedCount; i++) {
      var sx = Math.random() * w, sy = Math.random() * h * 0.3;
      channels.push(traceChannel(sx, sy));
    }
    phase = 'flowing'; phaseTimer = 0; fadeAlpha = 1;
  }

  function frame(ctx, cw, ch, t, colors, quality) {
    w = cw; h = ch; col = colors;
    ctx.clearRect(0, 0, w, h);

    if (phase === 'fading') {
      fadeAlpha -= 0.016;
      if (fadeAlpha <= 0) { init(w, h, col); return; }
    }

    ctx.globalAlpha = fadeAlpha;
    ctx.strokeStyle = col.accent;
    ctx.lineCap = 'round';

    for (var c = 0; c < channels.length; c++) {
      var path = channels[c];
      for (var p = 1; p < path.length; p++) {
        var flow = path[p].flow;
        ctx.beginPath();
        ctx.moveTo(path[p - 1].x, path[p - 1].y);
        ctx.lineTo(path[p].x, path[p].y);
        ctx.lineWidth = 0.5 + Math.sqrt(flow) * 0.5;
        ctx.globalAlpha = fadeAlpha * Math.min(0.6, 0.15 + Math.sqrt(flow) * 0.1);
        ctx.stroke();
      }
    }

    if (phase === 'flowing') {
      phase = 'hold'; phaseTimer = t;
    } else if (phase === 'hold' && t - phaseTimer > 3000) {
      phase = 'fading';
    }

    ctx.globalAlpha = 1;
  }

  function cleanup() { heightmap = null; channels = []; }

  return { init: init, frame: frame, cleanup: cleanup };
})();
```

- [ ] **Step 2: Visually verify + commit**

```bash
git add src/components/HeroCanvas.astro
git commit -m "feat: implement Erosion Channels animation

Noise heightmap with steepest-descent water flow, basin filling for
local minima. Flow accumulation widens channels. Auto-regenerates."
```

---

### Task 14: Final Build Verification & Visual QA

**Files:** None modified — verification only.

- [ ] **Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds, no errors, no warnings about missing files.

- [ ] **Step 2: Check build size**

Run: `ls -la dist/index.html`
Verify the inline script hasn't bloated the page excessively. The script should add roughly 15-20KB to the HTML.

- [ ] **Step 3: Visual QA checklist**

Run: `npm run dev` and verify each of the following:

1. Each of the 8 animations renders correctly when its pill is clicked.
2. Switcher pills show active/inactive states correctly.
3. Hero text remains readable over all animations (gradient overlay working).
4. Theme toggle (dark/light) updates animation colors without restart.
5. Resize browser window — canvas re-sizes, animation re-inits.
6. Scroll past hero — animation pauses (check via devtools Performance tab).
7. Mobile viewport (~375px) — pills show short labels, horizontal scroll works.
8. `prefers-reduced-motion` — canvas and switcher are hidden (toggle in devtools).
9. Keyboard: Tab to a pill, use arrow keys to navigate, verify only switcher responds (not carousel).
10. Page refresh preserves selected animation (sessionStorage).

- [ ] **Step 4: Fix any issues found in QA**

Address any visual or functional issues discovered during QA.

- [ ] **Step 5: Final commit if any QA fixes were needed**

```bash
git add -A
git commit -m "fix: QA fixes for hero canvas animations"
```
